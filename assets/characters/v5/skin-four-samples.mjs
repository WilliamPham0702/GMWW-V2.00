import {mountLayeredEight} from './skin-layered-eight.mjs';
import {mountVolume360} from './skin-volume-360.mjs';
export const SAMPLE_NAMES=['2.5D cắt lớp','Mesh từng mảng + texture chuẩn','Full 3D base body','Hiệu chỉnh theo 8 hướng'];
export function mountSample(rig,texture,mode){
 if(![1,2,3,4].includes(mode))throw Error('INVALID_SAMPLE');
 if(mode===3)return mountVolume360(rig,texture);
 return mountLayeredEight(rig,Array.isArray(texture)?texture:Array(8).fill(texture),{curved:mode===2,calibrated:mode===4});
}
