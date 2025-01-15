import * as fs from 'fs';
import * as path from 'path';

export interface MappedImageInfo {
    mappedImageName: string;
    coords?: { left: number; top: number; right: number; bottom: number };
}

interface MappedImagesResult {
    texturesFilesMappedImagesDictionary: Record<string, MappedImageInfo[]>;
    duplicateImages: { filename: string; image: string }[];
}

export function getMappedImages(folderPath: string): MappedImagesResult {
    const texturesFilesMappedImagesDictionary: Record<string, MappedImageInfo[]> = {};
    const mappedImagesSet: Set<string> = new Set();
    const duplicateImages: { filename: string; image: string }[] = [];

    const files = fs.readdirSync(folderPath);

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            const subResults = getMappedImages(filePath);
            Object.assign(texturesFilesMappedImagesDictionary, subResults.texturesFilesMappedImagesDictionary);
            duplicateImages.push(...subResults.duplicateImages);
        } else if (file.toLowerCase().endsWith('.ini') && file.toLowerCase() !== 'handcreatedmappedimages.ini') {
            const content = fs.readFileSync(filePath, 'utf-8');
            // TODO include the case where there is comments in the ini file
            const matches = [...content.matchAll(/MappedImage (\S+)(?:\s+Texture\s*=\s*(\S+))?(?:\s+TextureWidth\s*=\s*\d+)?(?:\s+TextureHeight\s*=\s*\d+)?(?:\s+Coords\s*=\s*Left:(\d+)\s*Top:(\d+)\s*Right:(\d+)\s*Bottom:(\d+))?/g)];

            for (const match of matches) {
                const [_, mappedImageName, texture = "", leftStr = "", topStr = "", rightStr = "", bottomStr = ""] = match;

                const coords = leftStr && topStr && rightStr && bottomStr
                    ? {
                        left: parseInt(leftStr, 10),
                        top: parseInt(topStr, 10),
                        right: parseInt(rightStr, 10),
                        bottom: parseInt(bottomStr, 10),
                    }
                    : undefined;

                const textureLower = texture.toLowerCase();
                if (!texturesFilesMappedImagesDictionary[textureLower]) {
                    texturesFilesMappedImagesDictionary[textureLower] = [];
                }
                texturesFilesMappedImagesDictionary[textureLower].push({mappedImageName, coords,});
                if (mappedImagesSet.has(mappedImageName)) {
                    duplicateImages.push({ filename: file, image:mappedImageName });
                } else {
                    mappedImagesSet.add(mappedImageName);
                }
            }
        }
    }

    return {
        texturesFilesMappedImagesDictionary,
        duplicateImages,
    };
}