/* 海拔管理模块入口 */

import ElevationMap from './elevation-map';
import {
  SLOPE_TYPES,
  SLOPE_DIRECTIONS,
  getSlopeType,
  detectSlopes,
  isWalkable,
  getSlopeCost,
  getSlopeVertexes,
} from './slope';
import {
  getElevatedPosition,
  getElevatedIsometricPosition,
  getElevatedPositions,
  getElevatedIsometricPositions,
  getRenderOrder,
} from './render';
import aStarElevation, { getElevationAwareNeighbors } from './a-star-elevation';

export {
  ElevationMap,
  SLOPE_TYPES,
  SLOPE_DIRECTIONS,
  getSlopeType,
  detectSlopes,
  isWalkable,
  getSlopeCost,
  getSlopeVertexes,
  getElevatedPosition,
  getElevatedIsometricPosition,
  getElevatedPositions,
  getElevatedIsometricPositions,
  getRenderOrder,
  aStarElevation,
  getElevationAwareNeighbors,
};
