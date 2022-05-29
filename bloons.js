import {defs, tiny} from './examples/common.js';
import {Shape_From_File} from './examples/obj-file-demo.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene
} = tiny;

export class Bloons extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            cube: new defs.Cube(),
            balloon: new Shape_From_File("assets/balloon.obj"),
            monkey: new Shape_From_File("assets/monkey.obj"),
            dart: new Shape_From_File("assets/dart.obj")
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test2: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            ring: new Material(new Ring_Shader()),
            balloon: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0.5, color: hex_color("#ffffff")}),
            dart: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0.5, color: hex_color("#bfbfd0")}),
            monkey: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0.5, color: hex_color("#bb946a")}),
            platform: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0.5, color: hex_color("#4f2921")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));

        this.balloon_colors = [
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0)];
            
        this.aim_up = false;
        this.aim_down = false;
        this.shoot = false;

        this.model_transform_dart = this.model_transform_dart_default = Mat4.identity();

        // added a default dart matrix, so we can easily reset the dart after modifying the dynamic matrix 
        this.model_transform_dart_default 
            = this.model_transform_dart_dynamic 
            = this.model_transform_dart_default.times(Mat4.translation(-18,-2,0))
                                                            .times(Mat4.rotation(-Math.PI/2, 0, 1, 0))
                                                            .times(Mat4.scale(0.5, 0.5, 0.5));
        // dart angle will go between 0 and 90 degrees
        this.dart_angle = 0;
        
        // records time since "shoot" button was invoked
        // resets the shot after 3s
        this.elapsed_shot_time = 0;

        // remaining shots if we want to implement limited shots later on
        this.shots_left = 5;

        // balloons that have been popped
        this.popped_balloons = [];
        this.balloon_count = 0;
        this.popped_balloons[0] = -1;

    }

    // randomize balloon colors after each game ends
    set_balloon_colors() {
        this.balloon_colors = [
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0),
            color(Math.random(), Math.random(), Math.random(), 1.0), color(Math.random(), Math.random(), Math.random(), 1.0)];
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Aim Up", ["Control", "1"], () => {this.aim_up = true;}, '#6E6460', () => {this.aim_up = false;});
        this.key_triggered_button("Aim Down", ["Control", "2"], () => {this.aim_down = true;}, '#6E6460', () => {this.aim_down = false;});
        this.key_triggered_button("Shoot", ["Control", "3"], () => {this.shoot = true;}, '#6E6460');
        
    }

    draw_balloons(context, program_state, model_transform, balloon_number, balloon_row) {


        model_transform = model_transform.times(Mat4.translation(5, 0, 0))
        let balloon_num = balloon_number + (balloon_row*6);
        for (let i = 0; i < this.balloon_count; i++) {
            if (this.popped_balloons[i] === balloon_num) {
                return model_transform;
            }
        }
        this.shapes.balloon.draw(context, program_state, model_transform, this.materials.balloon.override({color: this.balloon_colors[balloon_num]}));

        return model_transform;
    }

    find_popped_balloons(x_pos, y_pos) {
        let horiz_balloon = -1;
        if (x_pos < -36 && x_pos >= -41) { horiz_balloon = 1;}
        else if (x_pos < -41 && x_pos >= -46) { horiz_balloon = 2;}
        else if (x_pos < -46 && x_pos >= -51) { horiz_balloon = 3;}
        else if (x_pos < -51 && x_pos >= -56) { horiz_balloon = 4;}
        else if (x_pos < -56 && x_pos >= -61) { horiz_balloon = 5;}
        else if (x_pos < -61 && x_pos >= -66) { horiz_balloon = 6;}

        let pop_ball;
        // first row
        if (y_pos < 10 && y_pos > 4) {
            switch (horiz_balloon) {
                case 1: pop_ball = 0; break;
                case 2: pop_ball = 1; break;
                case 3: pop_ball = 2; break;
                case 4: pop_ball = 3; break;
                case 5: pop_ball = 4; break;
                case 6: pop_ball = 5; break;
                default: pop_ball = -1;
            }
        }
        // second row
        else if (y_pos < 17 && y_pos > 11) {
            switch (horiz_balloon) {
                case 1: pop_ball = 6; break;
                case 2: pop_ball = 7; break;
                case 3: pop_ball = 8; break;
                case 4: pop_ball = 9; break;
                case 5: pop_ball = 10; break;
                case 6: pop_ball = 11; break;
                default: pop_ball = -1;
            }
        }
        // third row
        else if (y_pos < 24 && y_pos > 18) {
            switch (horiz_balloon) {
                case 1: pop_ball = 12; break;
                case 2: pop_ball = 13; break;
                case 3: pop_ball = 14; break;
                case 4: pop_ball = 15; break;
                case 5: pop_ball = 16; break;
                case 6: pop_ball = 17; break;
                default: pop_ball = -1;
            }
        }
        // fourth row
        else if (y_pos < 31 && y_pos > 25) {
            switch (horiz_balloon) {
                case 1: pop_ball = 18; break;
                case 2: pop_ball = 19; break;
                case 3: pop_ball = 20; break;
                case 4: pop_ball = 21; break;
                case 5: pop_ball = 22; break;
                case 6: pop_ball = 23; break;
                default: pop_ball = -1;
            }
        }

        return pop_ball;
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, -5, -40));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const light_position = vec4(0, 5, 5, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        const t = this.t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        // balloons
        let model_transform_balloon = model_transform.times(Mat4.scale(0.5, 0.5, 0.5));
        // this.shapes.balloon.draw(context, program_state, model_transform_balloon, this.materials.balloon)

        for (let j = 0; j < 4; j++) {
            for (let i = 0; i < 6; i++) {
                model_transform_balloon = this.draw_balloons(context, program_state, model_transform_balloon, i, j);
            }
            model_transform_balloon = model_transform_balloon.times(Mat4.translation(-30, 7, 0));
        }
        
        // monkey
        let model_transform_monkey = Mat4.identity();
        model_transform_monkey = model_transform_monkey.times(Mat4.translation(-20, -3, 0))
                                                        .times(Mat4.rotation(Math.PI/2, -1, 0, 0))
                                                        .times(Mat4.rotation(Math.PI/2, 0, 0, 1))
                                                        
        this.shapes.monkey.draw(context, program_state, model_transform_monkey, this.materials.monkey);

        // platform
        let model_transform_platform = Mat4.identity();
        model_transform_platform = model_transform_platform.times(Mat4.translation(-20, -5, 0))
                                                            .times(Mat4.scale(3, 0.5, 2))
        this.shapes.cube.draw(context, program_state, model_transform_platform, this.materials.platform);
        
        // limit the dart to 90 degrees
        if(this.aim_up && this.dart_angle < 90){

            // 180 makes dart_angle consistent with unit circle angles
            this.dart_angle += dt*180;
            // console.log(this.dart_angle);
            this.model_transform_dart_dynamic = this.model_transform_dart_dynamic.times(Mat4.translation(0, 0, 3))
                                                                    .times(Mat4.rotation(Math.PI*dt, 1, 0, 0))
                                                                    .times(Mat4.translation(0, 0, -3));
        }
        
        // limit dart above horizontal
        if(this.aim_down && this.dart_angle > 0){
            
            this.dart_angle -= dt*180;
            // console.log(this.dart_angle);
            this.model_transform_dart_dynamic = this.model_transform_dart_dynamic.times(Mat4.translation(0, 0, 3))
                                                                    .times(Mat4.rotation(Math.PI*dt, -1, 0, 0))
                                                                    .times(Mat4.translation(0, 0, -3));
        }

        // shoot dart
        if(this.shoot){
            
            // record time since dart was shot
            this.elapsed_shot_time += dt*100;
            // this.model_transform_dart_dynamic = this.model_transform_dart_dynamic.times(Mat4.translation(0, 1, -10));

            // convert dart angle to radians
            let radian_angle = (this.dart_angle * Math.PI/180);

            // acceleration value: change if needed
            let acceleration = 11;
            let test_time = this.elapsed_shot_time / 100;

            // initial velocity values: change if needed
            let init_velocity_y = 50;
            let init_velocity_x = 30;

            // calculate positions
                // delta y = v0 * sin(beta) * t - 1/2 (g) t^2
            let y_pos = ((init_velocity_y * Math.sin(radian_angle) * test_time) - (0.5 * acceleration * test_time**2));
            // console.log(y_pos);
                // delta x = v0 * t
            let x_pos = -(init_velocity_x * test_time);
            // console.log(x_pos);

            // statically (not dynamically)compute where position of dart should be
            this.model_transform_dart = this.model_transform_dart.times(Mat4.translation(-18,-2,0))
                                                                .times(Mat4.rotation(-Math.PI/2, 0, 1, 0))
                                                                .times(Mat4.scale(0.5, 0.5, 0.5))
                                                                .times(Mat4.translation(0, y_pos, x_pos));
                        
            // modify dart angle as it travels and gradually decrease as time goes on
            radian_angle -= (this.elapsed_shot_time^2)/250;
            this.model_transform_dart = this.model_transform_dart.times(Mat4.translation(0, 0, 3))
                                                                .times(Mat4.rotation(radian_angle, 50, 0, 0))
                                                                .times(Mat4.translation(0, 0, -3))


            this.shapes.dart.draw(context, program_state, this.model_transform_dart, this.materials.dart);

            // add balloons that are popped
            let pop_balloon = this.find_popped_balloons(x_pos, y_pos);

            // document popped balloons
            if (pop_balloon !== -1) {
                let balloon_counted = false;
                for (let i = 0; i < this.balloon_count; i++) {
                    if (this.popped_balloons[i] === pop_balloon) {
                        balloon_counted = true;
                    }
                }
                if (!balloon_counted) {
                    this.popped_balloons[this.balloon_count] = pop_balloon;
                    this.balloon_count++;
                    // console.log("count " + this.balloon_count);
                    // console.log("Popped: " + this.popped_balloons[this.balloon_count]);
                }
            }

            /* Console information:
             console.log("Y pos: " + y_pos);
             console.log("Radian value: " + Math.sin(radian_angle));
             console.log("Time: " + test_time);
             console.log("Init val: " + (init_velocity_y * Math.sin(radian_angle) * test_time));
             console.log("Accel val: " + (0.5 * acceleration * test_time**2));
            */
            
            // reset model
            this.model_transform_dart = Mat4.identity();
        }


        // reset dart after 3s
        if(this.elapsed_shot_time > 300){
            this.shoot = false;
            this.elapsed_shot_time = 0;
            this.shots_left -= 1;
            this.dart_angle = 0;
            // reset dart back to default location
            this.model_transform_dart_dynamic = this.model_transform_dart_default;
        }

        if(!this.shoot)
            this.shapes.dart.draw(context, program_state, this.model_transform_dart_dynamic, this.materials.dart);
        
    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
            // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                
                // Gourand Shader needs to compute color calculation in vertex instead of fragment
                vertex_col = vec4( shape_color.xyz * ambient, shape_color.w );
                vertex_col.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                // Compute an initial (ambient) color:
                // gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                // gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                
                gl_FragColor = vertex_col;
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
            // The vertex's final resting place (in NDCS):
             gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
             point_position = model_transform * vec4(position, 1.0);
             // center with object coordinates
             center = model_transform * vec4(0.0, 0.0, 0.0, 1.0);
          
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
            // distance between fragment and center
            vec3 dis = vec3(point_position.xyz - center.xyz);
            // set alpha of the fragment
            gl_FragColor = vec4( vec3(0.69, 0.5, 0.25), cos(length(dis)*10.0));
        }`;
    }
}

