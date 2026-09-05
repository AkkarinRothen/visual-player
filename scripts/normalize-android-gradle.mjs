import { readFile, writeFile } from 'node:fs/promises';

const generatedGradleFile = 'android/capacitor-cordova-android-plugins/build.gradle';
const source = await readFile(generatedGradleFile, 'utf8');
const flatDirBlock = /\s+flatDir\s*\{\s*dirs 'src\/main\/libs', 'libs'\s*\}\s*/m;
const normalized = source.replace(flatDirBlock, '\n');

if (normalized !== source) {
  await writeFile(generatedGradleFile, normalized, 'utf8');
  console.log(`Removed unused flatDir repository from ${generatedGradleFile}`);
} else {
  console.log(`No flatDir repository to remove from ${generatedGradleFile}`);
}
