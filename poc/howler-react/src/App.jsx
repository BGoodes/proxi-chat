import React from 'react';
import { Howl, Howler } from 'howler';

import Sphere from "./component/Sphere.jsx";

import StartButton from "./component/StartButton.jsx";
import Sound from "./sounds/sound.mp3";

function App() {

    const sound = new Howl({
        src: Sound,
        html5: true,
        autoplay: false,
        loop: true
    });

    return (
        <div className="container">
            DONT WORK ALSO, FUCK!
            <StartButton sound={sound}/>
            <Sphere name="user" sound={Howler} />
            <Sphere name="sound" sound={sound}/>
        </div>
    );
}

export default App