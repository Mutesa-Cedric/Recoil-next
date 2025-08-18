/**
 * Utility to get the project root directory for recoil-next
 */

import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRootDir = path.resolve(__dirname, '..');

export default projectRootDir;
