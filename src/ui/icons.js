import {
  createElement, ArrowLeft, Search, Camera, ChevronRight, ChevronDown, Eye, EyeOff, Lock, LockOpen, Type, Square, Box, WandSparkles,
  MousePointer2, MessageSquare, Scan, Undo2, Redo2, LibraryBig, Download, Upload, CircleHelp, Play, Pause, RotateCcw, Share2,
  Move3d, Rotate3d, Scale3d, Magnet, Grid3x3, Folder, Group, Ungroup, Trash2, Copy, Plus, X, Sparkles, Cog, Car, Building2,
  Building, Trees, Armchair, Orbit, Shapes, LayoutGrid, Ruler, FileText, Image, Cuboid, House, Check, Link, Pencil, Zap, Circle,
  Triangle, Cylinder, Package, Shuffle, Save, FolderOpen, FilePlus, CircleAlert, Frame, Film, Move, RefreshCw, Keyboard,
  Users, UserPlus, SquareDashed, PencilRuler, Blocks, ArrowDownToLine, Boxes, Palette, Info, Minus, ZoomIn, ZoomOut, PanelLeft,
  PanelRight, ChevronUp, Rocket, Flower2, Component, Layers, Globe, Hand, Maximize2, Crop,
} from 'lucide';

const MAP = {
  'arrow-left': ArrowLeft, search: Search, camera: Camera, 'chevron-right': ChevronRight, 'chevron-down': ChevronDown, 'chevron-up': ChevronUp,
  eye: Eye, 'eye-off': EyeOff, lock: Lock, unlock: LockOpen, type: Type, square: Square, box: Box, wand: WandSparkles, pointer: MousePointer2,
  message: MessageSquare, fit: Scan, undo: Undo2, redo: Redo2, library: LibraryBig, download: Download, upload: Upload, help: CircleHelp,
  play: Play, pause: Pause, reset: RotateCcw, share: Share2, move: Move3d, rotate: Rotate3d, scale: Scale3d, magnet: Magnet, grid: Grid3x3,
  folder: Folder, group: Group, ungroup: Ungroup, trash: Trash2, copy: Copy, plus: Plus, x: X, sparkles: Sparkles, cog: Cog, car: Car,
  'building-2': Building2, building: Building, trees: Trees, armchair: Armchair, orbit: Orbit, shapes: Shapes, 'layout-grid': LayoutGrid,
  ruler: Ruler, file: FileText, image: Image, cuboid: Cuboid, home: House, check: Check, link: Link, pencil: Pencil, zap: Zap, circle: Circle,
  triangle: Triangle, cylinder: Cylinder, package: Package, shuffle: Shuffle, save: Save, 'folder-open': FolderOpen, 'file-plus': FilePlus,
  alert: CircleAlert, frame: Frame, film: Film, 'move-h': Move, refresh: RefreshCw, keyboard: Keyboard, users: Users, 'user-plus': UserPlus,
  dashed: SquareDashed, blueprint: PencilRuler, blocks: Blocks, floor: ArrowDownToLine, boxes: Boxes, palette: Palette, info: Info, minus: Minus,
  'zoom-in': ZoomIn, 'zoom-out': ZoomOut, 'panel-left': PanelLeft, 'panel-right': PanelRight, rocket: Rocket, flower: Flower2, component: Component,
  layers: Layers, globe: Globe, hand: Hand, expand: Maximize2, crop: Crop,
};

/** Create an inline SVG icon element. */
export function icon(name, size = 18, stroke = 1.8) {
  const node = MAP[name] || Box;
  return createElement(node, { width: size, height: size, 'stroke-width': stroke });
}

const CAT_ICON = { Architecture: 'building-2', Furniture: 'armchair', Vehicles: 'car', City: 'building', Nature: 'trees', Machines: 'cog', Physics: 'orbit', Primitives: 'shapes', Utility: 'box' };
const PREFAB_ICON = { cube: 'box', sphere: 'circle', cylinder: 'cylinder', cone: 'triangle', group: 'folder', label: 'type', imported: 'package', rocket: 'rocket', plant: 'flower', gear: 'cog', crate: 'package' };
export const iconForPrefab = (def) => PREFAB_ICON[def?.id] || CAT_ICON[def?.cat] || 'box';
export const iconForCat = (c) => CAT_ICON[c] || 'layout-grid';
