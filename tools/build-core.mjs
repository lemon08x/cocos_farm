import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {writeFile} from 'node:fs/promises';
import {transformAsync} from '@babel/core';
import transformForOf from '@babel/plugin-transform-for-of';
import transformSpread from '@babel/plugin-transform-spread';
import transformDestructuring from '@babel/plugin-transform-destructuring';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result=await build({ entryPoints: [resolve(root,'core/bridge.ts')], bundle: true, format: 'esm', platform:'browser', target: 'es2020', minify: false, write:false, tsconfigRaw:{compilerOptions:{target:'ES2020'}} });
// Creator's loose ES5 transform assumes iterable spreads/loops are arrays.
// Preserve Map/Set semantics before its compiler sees this unchanged rules snapshot.
const transformed=await transformAsync(result.outputFiles[0].text,{configFile:false,babelrc:false,plugins:[[transformForOf,{loose:false}],[transformSpread,{loose:false}],[transformDestructuring,{loose:false}]],compact:false});
await writeFile(resolve(root,'assets/scripts/FarmCore.ts'),'// @ts-nocheck\n// Generated from core/bridge.ts. Run npm run core to regenerate.\n'+transformed.code);
console.log('Farm core bundled from the preserved 0.27.0 source.');
