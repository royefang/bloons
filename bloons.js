import {defs, tiny} from './examples/common.js';
import {Shape_From_File} from './examples/obj-file-demo.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {Textured_Phong} = defs

export class Bloons extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            cube: new defs.Cube(),
            balloon: new Shape_From_File("assets/balloon.obj"),
            monkey: new Shape_From_File("assets/monkey.obj"),
            dart: new Shape_From_File("assets/dart.obj")
        };

        // *** Materials
        this.materials = {

            balloon: new Material(new defs.Phong_Shader(),
                {ambient: 0.8, diffusivity: 0.5, specularity: 0.1, color: hex_color("#000000")}),
            dart: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0.5, color: hex_color("#444444")}),
            dart_previous: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0.5, color: color(255, 0, 0, 0.5)}),
            monkey: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0.5, color: hex_color("#bb946a")}),
            platform: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0.5, color: hex_color("#4f2921")}),
            cloud: new Material(new Texture_Scroll_X(), {
                color: hex_color("#aaaaaa"),
                ambient: 0.5, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/cloud256.PNG", "NEAREST")
                }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));

        this.balloon_colors = [...Array(24)].map((_, i) => (color(Math.random(), Math.random(), Math.random(), 1.0)));
            
        this.aim_up = false;
        this.aim_down = false;
        this.shoot = false;

        this.model_transform_dart = 
        this.model_transform_dart_default = 
        this.model_transform_dart_previous =
        Mat4.identity();

        this.model_transform_dart_previous = this.model_transform_dart_previous.times(Mat4.translation(-200,-200,-200))

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

        // trigger hard mode
        this.hard_mode = false;

        // play sound
        this.sound_played = false;

        // add extra darts
        this.shame_darts = 0;

        // modify on screen text
        this.controls_html = document.getElementById('controls');
        this.darts_left_html = document.getElementById('darts-left');

    }

    // randomize balloon colors after each game ends
    set_balloon_colors() {
        this.balloon_colors = [...Array(24)].map((_, i) => (color(Math.random(), Math.random(), Math.random(), 1.0)));
    }

    make_control_panel() {
        
        if (this.shots_left <= 0 || this.balloon_count === 24){
            this.key_triggered_button("Reset", ["r"], () => {this.reset_game();}, '#6E6460');
        }
        
        else{
            this.key_triggered_button("Aim Up", ["w"], () => {this.aim_up = true;}, '#6E6460', () => {this.aim_up = false;});
            this.key_triggered_button("Aim Down", ["s"], () => {this.aim_down = true;}, '#6E6460', () => {this.aim_down = false;});
            this.key_triggered_button("Shoot", [" "], () => {this.shoot = true;}, '#6E6460');
            this.key_triggered_button("Hard mode", ["h"], () => {this.hard_mode = !(this.hard_mode);}, '#6E6460');
            this.key_triggered_button("Key of shame", ["e"], () => {this.shots_left++; this.shame_darts++;}, '#6E6460');
        }
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
        else if (x_pos < -42 && x_pos >= -47) { horiz_balloon = 2;}
        else if (x_pos < -47 && x_pos >= -52) { horiz_balloon = 3;}
        else if (x_pos < -52 && x_pos >= -57) { horiz_balloon = 4;}
        else if (x_pos < -57 && x_pos >= -62) { horiz_balloon = 5;}
        else if (x_pos < -62 && x_pos >= -69) { horiz_balloon = 6;}

        let pop_ball = -1;
        // first row
        if (y_pos <= 16 && y_pos > 9.5) {
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
        else if (y_pos <= 23 && y_pos > 16.5) {
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
        else if (y_pos <= 30 && y_pos > 23.5) {
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
        else if (y_pos <= 37 && y_pos > 30.5) {
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

    reset_game() {
        this.shots_left = 5;
        this.game_over = false;
        this.popped_balloons = [-1];
        this.balloon_count = 0;
        this.set_balloon_colors();
        this.make_control_panel();
        this.controls_html.innerHTML = '(W) Aim Up, (S) Aim Down, (Space) Shoot, (H) Hard Mode, (E) Button of shame'
        this.shoot = false;
        this.sound_played = false;
    }

    display(context, program_state) {


        if(this.shots_left == 0 || this.balloon_count == 24){

            this.controls_html.innerHTML = '(R) Reset'
    
            if(this.balloon_count !== 24){
                // this.darts_left_html.innerHTML = '';
                this.darts_left_html.innerHTML = `You only popped ${this.balloon_count} balloons and 
                                                        used ${this.shame_darts} darts of shame. 
                                                        Wow, you are terrible at this game. I hate you.`;
                // sound effect - loss
                if(!this.sound_played) {
                    var snd = new Audio("assets/loss.mp3"); 
                    snd.volume = 0.2;
                    snd.play();
                    this.sound_played = true;
                }
            }
            else{
                // this.darts_left_html.innerHTML = '';
                this.darts_left_html.innerHTML = `You popped all the balloons and only used ${this.shame_darts} extra darts!
                                                 Guess you aren't a terrible person after all. Try again pretty please owo?`;
                // sound effect - win
                if(!this.sound_played)
                {
                    var snd = new Audio("assets/win.mp3"); 
                    snd.volume = 0.2;
                    snd.play();
                    this.sound_played = true;
                }
            }
        }

        else{
            this.darts_left_html.innerHTML = `You have ${this.shots_left} darts 
                                    & ${24 - this.balloon_count} balloons left.`;
        }
        


        

        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, -5, -40));
        }

        // still need to adjust angle of camera in addition to below transformation
        if(this.hard_mode){
            // this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            let hard_mode_camera = Mat4.look_at(vec3(-20, 0, 20), vec3(0, 0, 0), vec3(0, 1, 0))
            hard_mode_camera = hard_mode_camera.times(Mat4.translation(20, -5, -15));
            program_state.set_camera(hard_mode_camera);
        }
        else
            program_state.set_camera(Mat4.translation(0, -5, -40));


        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const light_position = vec4(0, 5, 5, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        const t = this.t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();
        // let model_transform_previous_dart = Mat4.identity();

        // background
        let model_transform_cloud = model_transform.times(Mat4.scale(100, 100, 75));
        this.shapes.cube.draw(context, program_state, model_transform_cloud, this.materials.cloud)

        // balloons
        let model_transform_balloon = model_transform.times(Mat4.scale(0.5, 0.5, 0.5));
        // this.shapes.balloon.draw(context, program_state, model_transform_balloon, this.materials.balloon)
        model_transform_balloon = model_transform_balloon.times(Mat4.translation(0, 5, 0));

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
        if(this.aim_up && this.dart_angle < 90 && !this.shoot && this.shots_left !== 0){

            // 180 makes dart_angle consistent with unit circle angles
            this.dart_angle += dt*180;
            // console.log(this.dart_angle);
            this.model_transform_dart_dynamic = this.model_transform_dart_dynamic.times(Mat4.translation(0, 0, 3))
                                                                    .times(Mat4.rotation(Math.PI*dt, 1, 0, 0))
                                                                    .times(Mat4.translation(0, 0, -3));
        }
        
        // limit dart above horizontal
        if(this.aim_down && this.dart_angle > 0 && !this.shoot && this.shots_left !== 0){
            
            this.dart_angle -= dt*180;
            // console.log(this.dart_angle);
            this.model_transform_dart_dynamic = this.model_transform_dart_dynamic.times(Mat4.translation(0, 0, 3))
                                                                    .times(Mat4.rotation(Math.PI*dt, -1, 0, 0))
                                                                    .times(Mat4.translation(0, 0, -3));
        }
        
        // draw prev dart (prev dart recorded after 3s reset)
        if(!this.hard_mode)
            this.shapes.dart.draw(context, program_state, this.model_transform_dart_previous, this.materials.dart_previous);

        // shoot dart
        if(this.shoot && this.shots_left !== 0){
            
            // record time since dart was shot
            this.elapsed_shot_time += dt*100;
            // this.model_transform_dart_dynamic = this.model_transform_dart_dynamic.times(Mat4.translation(0, 1, -10));

            // convert dart angle to radians
            let radian_angle = (this.dart_angle * Math.PI/180);

            // acceleration value: change if needed
            let acceleration = 40;
            let test_time = this.elapsed_shot_time / 100;

            // initial velocity values: change if needed
            let init_velocity_y = 70;
            let init_velocity_x = 50;

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
            radian_angle -= (this.elapsed_shot_time^2)/175;
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
                    // sound effect
                    var snd = new Audio("assets/pop.mp3"); 
                    snd.volume = 0.2;
                    snd.play();
                    
                    this.popped_balloons[this.balloon_count] = pop_balloon;
                    this.balloon_count++;
                    // console.log("popped" + pop_balloon);
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
            // console.log(this.shots_left);
            this.dart_angle = 0;
            // prev dart
            this.model_transform_dart_previous = this.model_transform_dart_dynamic;
            // reset dart back to default location
            this.model_transform_dart_dynamic = this.model_transform_dart_default;
            
        }

        // ran out of shots
        // console.log(this.balloon_count)
        if (this.shots_left === 0 || this.balloon_count === 24) {
            this.make_control_panel()
            this.model_transform_dart_previous = model_transform.times(Mat4.translation(-200,-200,-200));
        }
        

        if((this.shots_left !== 0 || this.balloon_count ===24) && !this.shoot){
            this.shapes.dart.draw(context, program_state, this.model_transform_dart_dynamic, this.materials.dart);
        }

        
    }
}

class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){

                // Sample the texture image in the correct place:
                vec2 scroll_tex_coord = f_tex_coord;

                // mod to keep value between 0 and 2, prevents coord value from growing excessively
                scroll_tex_coord.x -= mod(animation_time, 60.0)/20.0;
                
                vec4 tex_color = texture2D( texture, scroll_tex_coord);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

