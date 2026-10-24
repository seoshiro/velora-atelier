# Original Blender garden studies

The cypress and olive trees in `src/art/garden-trees.json` were modeled in Blender 5.2.2 LTS for this project: Bezier branches, asymmetric crown masses, OpenVDB voxel union, smoothing, decimation and smooth normals. Three.js renders these exported indexed meshes; it no longer constructs the trees from spheres and cylinders.

Positions are quantized at 4096 units per model unit, normals at 32767. Maximum position error is 0.000123 model units. The complete scene uses 9,396 tree triangles for two cypress and one olive. Meshes remain in the existing deferred scene module, render only when visible and dispose with the scene.

Architecture, lighting and illustrated SVG plates retain their restrained original design. The editable `.blend` is saved with the audit workspace; the GLB reference mesh library, Cycles previews and exact operation log accompany the independent audit release. GLB is a reference export; runtime consumes the indexed JSON geometry directly. All artwork is original and covered by the repository's MIT license; no external model, texture, service or paid resource is used.
