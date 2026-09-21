/**
 * districts.js — builds the contents of one section's stretch of the route.
 *
 * Everything a district contains is created here and handed to the chunk
 * manager, which owns its lifetime. Text comes from content.js; placement
 * comes from the path and the constants below.
 *
 * M7 will add the voxel scenery presets keyed by `section.district`
 * ("plaza", "harbour", "gardens", "snowfield"). Until then each district
 * gets a small set of marker blocks so the route reads as populated.
 */

import * as THREE from 'three';
import { groundText as gtCfg, palette, world as cfg } from '../config.js';
import { createRiser, riserLabelTransform } from './beam.js';
import { createGroundText } from './groundText.js';
import { createVoxelText } from './voxelText.js';
import { offsetFromPath, textHeadingAt } from './path.js';
import { boxGeometry, litMaterial } from './resources.js';

/* Where each element sits along the route, as an offset in normalised
 * progress from the section's anchor. The route is ~1115 units long, so
 * 0.01 here is roughly 11 world units. */
const LAYOUT = {
  RISER: 0.0,
  HEADING: 0.028,
  SUB_LABEL: 0.058,
  BODY_START: 0.074,
  BODY_STEP: 0.038,
};

/** Placeholder district massing — replaced by real props in M7. */
function createDistrictMarkers(u, seedColour) {
  const COUNT = 26;
  const mesh = new THREE.InstancedMesh(boxGeometry(), litMaterial(), COUNT);
  mesh.frustumCulled = false;

  const matrix = new THREE.Matrix4();
  const colour = new THREE.Color();
  const accents = palette.accents;

  for (let i = 0; i < COUNT; i++) {
    // Deterministic-ish scatter either side of the route.
    const along = u + (i / COUNT) * 0.16 - 0.01;
    const side = (i % 2 === 0 ? 1 : -1) * (26 + ((i * 37) % 22));
    const h = 1.5 + ((i * 53) % 9);
    const w = 1.4 + ((i * 29) % 4);

    const p = offsetFromPath(along, side, 0, h / 2);
    matrix.makeScale(w, h, w);
    matrix.setPosition(p.x, p.y, p.z);
    mesh.setMatrixAt(i, matrix);

    colour.setHex(i % 4 === 0 ? seedColour : accents[i % accents.length]);
    mesh.setColorAt(i, colour);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.userData.dispose = () => mesh.dispose();
  return mesh;
}

/**
 * @param {object} section  one entry from content.sections
 * @param {number} u        the section's anchor on the path
 * @returns {{ objects: THREE.Object3D[], updatables: THREE.Object3D[] }}
 */
export function buildDistrict(section, u, index) {
  const objects = [];
  const updatables = [];

  const add = (obj) => {
    if (!obj) return;
    objects.push(obj);
    if (typeof obj.update === 'function') updatables.push(obj);
  };

  /* ---- the beam's raised end, and the label printed on its top face ---- */
  add(createRiser(u + LAYOUT.RISER));

  const label = riserLabelTransform(u + LAYOUT.RISER);
  add(
    createGroundText(`${section.number} ${section.markerLabel}`, {
      position: label.position,
      rotationY: label.rotationY,
      worldWidth: label.width,
      variant: 'label',
      align: 'center',
      colour: palette.background,
    })
  );

  /* ---- the voxel heading ---- */
  const hu = u + LAYOUT.HEADING;
  add(
    createVoxelText(section.voxelHeading, {
      position: offsetFromPath(hu, cfg.CONTENT_SIDE, 0, 0),
      rotationY: textHeadingAt(hu),
    })
  );

  /* ---- the sub-label, flat on the ground in white caps ---- */
  if (section.subLabel) {
    const su = u + LAYOUT.SUB_LABEL;
    add(
      createGroundText(section.subLabel, {
        position: offsetFromPath(su, cfg.CONTENT_SIDE, 0, 0.01),
        rotationY: textHeadingAt(su),
        worldWidth: gtCfg.LABEL_WIDTH,
        variant: 'label',
        align: 'left',
        colour: palette.ink,
      })
    );
  }

  /* ---- body paragraphs, flat on the ground ---- */
  section.body.forEach((paragraph, i) => {
    const bu = u + LAYOUT.BODY_START + i * LAYOUT.BODY_STEP;
    add(
      createGroundText(paragraph, {
        position: offsetFromPath(bu, cfg.CONTENT_SIDE, 0, 0.01),
        rotationY: textHeadingAt(bu),
        worldWidth: gtCfg.BODY_WIDTH,
        variant: 'body',
        align: 'left',
        colour: palette.ink,
      })
    );
  });

  /* ---- scenery (placeholder massing until M7) ---- */
  add(createDistrictMarkers(u, palette.accents[index % palette.accents.length]));

  return { objects, updatables };
}
