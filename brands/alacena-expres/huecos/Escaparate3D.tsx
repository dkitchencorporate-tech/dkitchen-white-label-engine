import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Escaparate 3D de Alacena: botella de vino, cuña de manchego y caja regalo
// sobre un pedestal de nogal. Modelos generados por código (sin archivos que
// descargar), luz de estudio con sombras, giro automático y arrastre con el dedo.
// Se pausa fuera de pantalla y respeta «reducir movimiento».

const BURDEOS = 0x5e1621;
const ORO = 0xb8892f;
const CREMA = '#F6ECE4';

function texturaCanvas(ancho: number, alto: number, pintar: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  pintar(lienzo.getContext('2d')!);
  const t = new THREE.CanvasTexture(lienzo);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function madera(): THREE.CanvasTexture {
  return texturaCanvas(512, 512, (c) => {
    const g = c.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0, '#4a2c1a'); g.addColorStop(0.5, '#5d3a22'); g.addColorStop(1, '#43271a');
    c.fillStyle = g; c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 140; i++) {
      c.strokeStyle = `rgba(${30 + Math.random() * 30},${15 + Math.random() * 15},8,${0.15 + Math.random() * 0.25})`;
      c.lineWidth = 0.6 + Math.random() * 1.8;
      c.beginPath();
      const y = Math.random() * 512;
      c.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) c.lineTo(x, y + Math.sin(x / 60 + i) * 6);
      c.stroke();
    }
  });
}

function etiquetaVino(): THREE.CanvasTexture {
  return texturaCanvas(1024, 512, (c) => {
    c.fillStyle = CREMA; c.fillRect(0, 0, 1024, 512);
    c.strokeStyle = '#B8892F'; c.lineWidth = 6; c.strokeRect(330, 40, 364, 432);
    c.fillStyle = '#2A1A14'; c.textAlign = 'center';
    c.font = '700 62px "Playfair Display", Georgia, serif'; c.fillText('Alacena', 512, 190);
    c.fillStyle = '#B8892F'; c.font = '800 24px Inter, Arial, sans-serif'; c.fillText('R E S E R V A   D E   L A   C A S A', 512, 240);
    c.fillStyle = '#5E1621'; c.font = 'italic 600 40px "Playfair Display", Georgia, serif'; c.fillText('Tinto crianza', 512, 330);
    c.fillStyle = '#6E5A4E'; c.font = '600 22px Inter, Arial, sans-serif'; c.fillText('Madrid · 75 cl · 14 %', 512, 400);
  });
}

function corteza(): THREE.CanvasTexture {
  const t = texturaCanvas(1024, 128, (c) => {
    c.fillStyle = '#3b2a1a'; c.fillRect(0, 0, 1024, 128);
    c.strokeStyle = 'rgba(120,90,50,0.55)'; c.lineWidth = 3;
    for (let fila = 0; fila < 4; fila++) {
      c.beginPath();
      for (let x = 0; x <= 1024; x += 16) c.lineTo(x, 16 + fila * 30 + (x / 16) % 2 * 12);
      c.stroke();
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function botella(): THREE.Group {
  const g = new THREE.Group();
  // Perfil de botella bordelesa (radio, altura) girado en torno al eje Y.
  const perfil = [
    [0, 0], [0.33, 0], [0.36, 0.03], [0.36, 1.25], [0.34, 1.38], [0.24, 1.55], [0.13, 1.72], [0.12, 2.15], [0.13, 2.18], [0.13, 2.25], [0, 2.25]
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const vidrio = new THREE.MeshPhysicalMaterial({ color: 0x1d0a0c, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, reflectivity: 0.9 });
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 64), vidrio);
  cuerpo.castShadow = true;
  g.add(cuerpo);
  const capsula = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.14, 0.42, 48), new THREE.MeshStandardMaterial({ color: BURDEOS, metalness: 0.7, roughness: 0.3 }));
  capsula.position.y = 2.05;
  g.add(capsula);
  const etiqueta = new THREE.Mesh(
    new THREE.CylinderGeometry(0.364, 0.364, 0.62, 64, 1, true, -Math.PI * 0.45, Math.PI * 0.9),
    new THREE.MeshStandardMaterial({ map: etiquetaVino(), roughness: 0.85 })
  );
  etiqueta.position.y = 0.62;
  g.add(etiqueta);
  return g;
}

function cunaQueso(): THREE.Group {
  const g = new THREE.Group();
  const radio = 0.85, alto = 0.55, angulo = Math.PI / 3.2;
  const forma = new THREE.Shape();
  forma.moveTo(0, 0);
  forma.absarc(0, 0, radio, 0, angulo, false);
  forma.lineTo(0, 0);
  const pasta = new THREE.MeshStandardMaterial({ color: 0xf2e2b6, roughness: 0.75 });
  const cuna = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: alto, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, curveSegments: 32 }), pasta);
  cuna.rotation.x = -Math.PI / 2;
  cuna.castShadow = true;
  g.add(cuna);
  const tex = corteza();
  const piel = new THREE.Mesh(
    new THREE.CylinderGeometry(radio + 0.012, radio + 0.012, alto + 0.01, 48, 1, true, Math.PI / 2 - angulo, angulo),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide })
  );
  piel.position.y = alto / 2;
  g.add(piel);
  return g;
}

function cajaRegalo(): THREE.Group {
  const g = new THREE.Group();
  const papel = new THREE.MeshStandardMaterial({ color: BURDEOS, roughness: 0.55 });
  const oro = new THREE.MeshStandardMaterial({ color: ORO, metalness: 0.85, roughness: 0.28 });
  const caja = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), papel);
  caja.position.y = 0.35;
  caja.castShadow = true;
  g.add(caja);
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.14, 0.96), papel);
  tapa.position.y = 0.74;
  tapa.castShadow = true;
  g.add(tapa);
  for (const [x, z] of [[0.07, 0.98], [0.98, 0.07]]) {
    const cinta = new THREE.Mesh(new THREE.BoxGeometry(x, 0.86, z), oro);
    cinta.position.y = 0.42;
    g.add(cinta);
  }
  for (const lado of [-1, 1]) {
    const lazo = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 16, 48), oro);
    lazo.position.set(lado * 0.13, 0.9, 0);
    lazo.rotation.set(Math.PI / 2.4, 0, lado * 0.5);
    lazo.scale.set(1, 0.6, 1);
    g.add(lazo);
  }
  return g;
}

export default function Escaparate3D({ className = '' }: { className?: string }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [sinWebgl, setSinWebgl] = useState(false);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setSinWebgl(true);
      return;
    }
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camara.position.set(0, 2.7, 7.6);
    camara.lookAt(0, 0.75, 0);

    escena.add(new THREE.HemisphereLight(0xfff4e6, 0x3a2418, 0.9));
    const clave = new THREE.SpotLight(0xffe8cc, 60, 20, Math.PI / 6, 0.5, 1.6);
    clave.position.set(3.5, 6, 4);
    clave.castShadow = true;
    clave.shadow.mapSize.set(1024, 1024);
    clave.shadow.radius = 6;
    escena.add(clave);
    const contra = new THREE.DirectionalLight(0xffd2a0, 1.4);
    contra.position.set(-4, 3, -3);
    escena.add(contra);

    const plato = new THREE.Group();
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 0.22, 96), new THREE.MeshStandardMaterial({ map: madera(), roughness: 0.6 }));
    pedestal.position.y = -0.11;
    pedestal.receiveShadow = true;
    plato.add(pedestal);
    const b = botella(); b.position.set(-0.15, 0, -0.35); plato.add(b);
    const q = cunaQueso(); q.position.set(0.85, 0, 0.55); q.rotation.y = -0.6; plato.add(q);
    const r = cajaRegalo(); r.position.set(-1.1, 0, 0.75); r.rotation.y = 0.5; r.scale.setScalar(0.85); plato.add(r);
    escena.add(plato);

    let ancho = 0, alto = 0;
    const redimensionar = () => {
      ancho = el.clientWidth; alto = el.clientHeight;
      renderer.setSize(ancho, alto, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camara.aspect = ancho / Math.max(alto, 1);
      camara.updateProjectionMatrix();
    };
    redimensionar();
    const ro = new ResizeObserver(redimensionar);
    ro.observe(el);

    // Arrastre para girar; después vuelve al giro automático.
    let arrastrando = false, ultimoX = 0, velocidad = reducir ? 0 : 0.0035;
    const abajo = (e: PointerEvent) => { arrastrando = true; ultimoX = e.clientX; };
    const mover = (e: PointerEvent) => {
      if (!arrastrando) return;
      plato.rotation.y += (e.clientX - ultimoX) * 0.01;
      ultimoX = e.clientX;
      render();
    };
    const arriba = () => { arrastrando = false; };
    renderer.domElement.addEventListener('pointerdown', abajo);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', arriba);

    let visible = true, marco = 0;
    const render = () => renderer.render(escena, camara);
    const bucle = () => {
      marco = requestAnimationFrame(bucle);
      if (!visible || document.hidden || arrastrando) return;
      plato.rotation.y += velocidad;
      render();
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 });
    io.observe(el);
    render();
    if (!reducir) bucle();

    return () => {
      cancelAnimationFrame(marco);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', arriba);
      escena.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          (mat as THREE.MeshStandardMaterial).map?.dispose();
          mat.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      velocidad = 0;
    };
  }, []);

  if (sinWebgl) return null;
  return <div ref={contenedor} className={`touch-pan-y cursor-grab active:cursor-grabbing ${className}`} />;
}
