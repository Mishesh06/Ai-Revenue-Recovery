"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Login3DCanvas — Professional Financial 3D Scene
 *
 * Inspired by 21st.dev design aesthetics:
 * - Elegant floating geometric orbs (not cubes) on a clean navy-white canvas
 * - Soft glowing data-sphere with orbital rings representing payment network nodes
 * - Subtle particle field as background "connectivity mesh"
 * - Smooth, slow institutional motion — NOT frantic or cartoonish
 * - Color palette: Deep Navy (#0A2540), Royal Blue (#2563EB), Emerald (#10B981), White
 */
export function Login3DCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // WebGL support check
    try {
      const test = document.createElement("canvas");
      const gl = test.getContext("webgl") || test.getContext("experimental-webgl");
      if (!gl) return;
    } catch {
      return;
    }

    let animationId: number;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // ─── Scene & Renderer ─────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf0f6ff, 0.008);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(0, 10, 70);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ─── Ambient + Directional Lighting ──────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x2563eb, 2.0);
    dirLight.position.set(30, 50, 30);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 0.8);
    rimLight.position.set(-40, -20, 20);
    scene.add(rimLight);

    // ─── Central Data Sphere (Financial Network Core) ────────────────────────
    const coreGeo = new THREE.SphereGeometry(9, 64, 64);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x0a2540,
      emissive: 0x0f3460,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.88,
      shininess: 120,
      specular: new THREE.Color(0x2563eb),
    });
    const coreOrb = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreOrb);

    // Wire overlay on the sphere (data mesh look)
    const wireGeo = new THREE.SphereGeometry(9.05, 20, 20);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wireMesh);

    // ─── Orbital Rings (Payment Network Nodes) ───────────────────────────────
    const ringColors = [0x2563eb, 0x10b981, 0x0a2540];
    const ringTilts = [0, Math.PI / 4, -Math.PI / 5];
    const ringRings: THREE.Line[] = [];

    ringColors.forEach((color, i) => {
      const radius = 14 + i * 5;
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= 128; j++) {
        const theta = (j / 128) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: i === 0 ? 0.55 : i === 1 ? 0.35 : 0.25,
      });
      const ring = new THREE.Line(geo, mat);
      ring.rotation.x = ringTilts[i];
      ring.rotation.z = (Math.PI / 180) * (i * 15);
      scene.add(ring);
      ringRings.push(ring);
    });

    // ─── Orbiting Satellite Nodes (Transaction Beacons) ──────────────────────
    interface Satellite {
      mesh: THREE.Mesh;
      orbitRadius: number;
      orbitSpeed: number;
      orbitAngle: number;
      orbitTilt: number;
      bobSpeed: number;
      bobAmp: number;
    }

    const satData: Satellite[] = [];
    const satColors = [0x2563eb, 0x10b981, 0x0a2540, 0x38bdf8, 0x059669, 0x1d4ed8];

    for (let i = 0; i < 6; i++) {
      const size = 1.2 + Math.random() * 1.0;
      const geo = i % 2 === 0
        ? new THREE.IcosahedronGeometry(size, 0)
        : new THREE.OctahedronGeometry(size, 0);
      const mat = new THREE.MeshPhongMaterial({
        color: satColors[i],
        emissive: satColors[i],
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.90,
        shininess: 80,
      });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      satData.push({
        mesh,
        orbitRadius: 20 + i * 3.5,
        orbitSpeed: 0.004 + i * 0.002,
        orbitAngle: (i / 6) * Math.PI * 2,
        orbitTilt: (Math.PI / 180) * (i * 20 - 30),
        bobSpeed: 0.5 + Math.random() * 0.5,
        bobAmp: 1.5 + Math.random() * 1.5,
      });
    }

    // ─── Connectivity Lines between Satellite Nodes ───────────────────────────
    const connectionLines: THREE.Line[] = [];
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.12,
    });

    for (let i = 0; i < 5; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const line = new THREE.Line(geo, lineMat);
      scene.add(line);
      connectionLines.push(line);
    }

    // ─── Background Particle Field (Connectivity Mesh) ───────────────────────
    const particleCount = 500;
    const posArr = new Float32Array(particleCount * 3);
    const colArr = new Float32Array(particleCount * 3);
    const pColors = [
      new THREE.Color(0x2563eb),
      new THREE.Color(0x10b981),
      new THREE.Color(0x0a2540),
      new THREE.Color(0x38bdf8),
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      posArr[i3]     = (Math.random() - 0.5) * 200;
      posArr[i3 + 1] = (Math.random() - 0.5) * 120;
      posArr[i3 + 2] = (Math.random() - 0.5) * 100;
      const c = pColors[Math.floor(Math.random() * pColors.length)];
      colArr[i3]     = c.r;
      colArr[i3 + 1] = c.g;
      colArr[i3 + 2] = c.b;
    }

    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    partGeo.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
    const partMat = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    // ─── Grid Floor Plane (Financial Data Grid) ──────────────────────────────
    const gridHelper = new THREE.GridHelper(160, 30, 0x2563eb, 0xcbd5e1);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.15;
    gridHelper.position.y = -28;
    scene.add(gridHelper);

    // ─── Mouse Parallax ──────────────────────────────────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // ─── Resize ──────────────────────────────────────────────────────────────
    const handleResize = () => {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // ─── Animate ─────────────────────────────────────────────────────────────
    let t = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      t += 0.005;

      // Rotate core orb slowly
      coreOrb.rotation.y = t * 0.25;
      coreOrb.rotation.x = Math.sin(t * 0.15) * 0.08;
      wireMesh.rotation.y = -t * 0.18;
      wireMesh.rotation.z = t * 0.06;

      // Orbital ring rotation
      ringRings[0].rotation.y = t * 0.30;
      ringRings[1].rotation.y = -t * 0.22;
      ringRings[2].rotation.y = t * 0.18;

      // Satellite orbits
      satData.forEach((sat, i) => {
        sat.orbitAngle += sat.orbitSpeed;
        const x = Math.cos(sat.orbitAngle) * sat.orbitRadius;
        const z = Math.sin(sat.orbitAngle) * sat.orbitRadius;
        const y = Math.sin(sat.orbitAngle * sat.bobSpeed + i) * sat.bobAmp;
        sat.mesh.position.set(
          x * Math.cos(sat.orbitTilt) - y * Math.sin(sat.orbitTilt),
          y * Math.cos(sat.orbitTilt) + x * Math.sin(sat.orbitTilt) * 0.2,
          z
        );
        sat.mesh.rotation.x += 0.012;
        sat.mesh.rotation.y += 0.018;
      });

      // Update connection lines between neighbouring satellites
      connectionLines.forEach((line, i) => {
        const a = satData[i % satData.length];
        const b = satData[(i + 1) % satData.length];
        const positions = new Float32Array([
          a.mesh.position.x, a.mesh.position.y, a.mesh.position.z,
          b.mesh.position.x, b.mesh.position.y, b.mesh.position.z,
        ]);
        line.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        (line.material as THREE.LineBasicMaterial).opacity =
          0.08 + 0.08 * Math.abs(Math.sin(t * 0.8 + i));
      });

      // Particle field gentle rotation
      particles.rotation.y = t * 0.025;
      particles.rotation.x = t * 0.010;

      // Camera parallax follow mouse
      camera.position.x += (mouseX * 8 - camera.position.x) * 0.015;
      camera.position.y += (-mouseY * 4 - camera.position.y + 10) * 0.015;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
