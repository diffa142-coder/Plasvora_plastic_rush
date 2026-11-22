// Utilitas shader dunia melengkung (Curved World) seperti game endless-runner kartun di video

export const curveUniforms = {
  uCurveY: { value: 0.0016 },
  uCurveX: { value: 0.0 }
};

export function applyCurvedWorld(material, strength = 1.0) {
  material.customProgramCacheKey = () => `curved-world-${strength}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCurveY = curveUniforms.uCurveY;
    shader.uniforms.uCurveX = curveUniforms.uCurveX;

    shader.vertexShader =
      `uniform float uCurveY;\nuniform float uCurveX;\n` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition = modelViewMatrix * mvPosition;
      float curveDist = max(0.0, -mvPosition.z - 5.0);
      float curveFactor = curveDist * curveDist * ${strength.toFixed(3)};
      mvPosition.y -= uCurveY * curveFactor;
      mvPosition.x += uCurveX * curveFactor;
      gl_Position = projectionMatrix * mvPosition;
      `
    );
  };
  return material;
}
