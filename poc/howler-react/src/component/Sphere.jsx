import React, { useState, useEffect, useRef } from 'react';
import '../css/sphere.css';

function Sphere(props) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const sphereRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - sphereRef.current.offsetWidth / 2,
                    y: e.clientY - sphereRef.current.offsetHeight / 2,
                });
                props.sound.pos(e.clientX, e.clientY, 0);
                console.log(e.clientX, e.clientY, 0)
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        console.log("Drag Start")
        e.preventDefault();
    };

    return (
        <div
            ref={sphereRef}
            className="sphere prevent-select"
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: 'grab',
            }}
            onMouseDown={handleMouseDown}
        >
            {props.name}
        </div>
    );
}

export default Sphere;