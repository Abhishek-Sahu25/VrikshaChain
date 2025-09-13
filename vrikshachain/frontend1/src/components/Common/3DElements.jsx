import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import './3DElements.css';

const ThreeDEarth = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    // Scene setup
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    
    // Create Earth with Ayurvedic texture
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const textureLoader = new THREE.TextureLoader();
    
    // Create custom Ayurvedic-themed texture
    const createAyurvedicTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      
      // Background gradient (earth tones)
      const gradient = context.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, '#2E7D32');
      gradient.addColorStop(0.5, '#689F38');
      gradient.addColorStop(1, '#8BC34A');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 512, 512);
      
      // Draw herb patterns
      context.fillStyle = '#1B5E20';
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = 5 + Math.random() * 10;
        this.drawHerb(context, x, y, size);
      }
      
      return new THREE.CanvasTexture(canvas);
    };
    
    const material = new THREE.MeshPhongMaterial({ 
      map: createAyurvedicTexture(),
      bumpScale: 0.05,
      specular: new THREE.Color(0x333333),
      shininess: 5
    });
    
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);
    
    // Add glowing atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(1.1, 32, 32);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x68c480,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);
    
    // Add floating herbs around the earth
    const herbs = [];
    const herbGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const herbMaterial = new THREE.MeshPhongMaterial({ color: 0x68c480 });
    
    for (let i = 0; i < 50; i++) {
      const herb = new THREE.Mesh(herbGeometry, herbMaterial);
      
      // Position in a sphere around earth
      const radius = 1.5 + Math.random() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      herb.position.x = radius * Math.sin(phi) * Math.cos(theta);
      herb.position.y = radius * Math.sin(phi) * Math.sin(theta);
      herb.position.z = radius * Math.cos(phi);
      
      herb.scale.set(
        1 + Math.random(),
        2 + Math.random() * 2,
        1 + Math.random()
      );
      
      herb.userData = {
        originalPosition: herb.position.clone(),
        speed: 0.001 + Math.random() * 0.002,
        angle: Math.random() * Math.PI * 2
      };
      
      scene.add(herb);
      herbs.push(herb);
    }
    
    camera.position.z = 3;
    
    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      
      earth.rotation.y += 0.001;
      atmosphere.rotation.y += 0.0005;
      
      // Animate floating herbs
      herbs.forEach(herb => {
        herb.userData.angle += herb.userData.speed;
        herb.position.x = herb.userData.originalPosition.x + Math.sin(herb.userData.angle) * 0.1;
        herb.position.y = herb.userData.originalPosition.y + Math.cos(herb.userData.angle) * 0.1;
        herb.rotation.x += 0.01;
        herb.rotation.y += 0.01;
      });
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);
  
  return <div ref={mountRef} className="earth-container" />;
};

// Helper function to draw herb shapes
THREE.Mesh.prototype.drawHerb = function(context, x, y, size) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - size/2, y - size);
  context.lineTo(x + size/2, y - size * 1.5);
  context.lineTo(x + size/2, y - size/2);
  context.closePath();
  context.fill();
};

export default ThreeDEarth;