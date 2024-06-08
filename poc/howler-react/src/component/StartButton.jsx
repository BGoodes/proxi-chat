import React from "react";

function StartButton(props) {

    const handleClick = () => {
        props.sound.play();
        console.log("Starting the song...");
    }

    return (
        <button onClick={handleClick}>
            Start
        </button>
    );
}

export default StartButton;