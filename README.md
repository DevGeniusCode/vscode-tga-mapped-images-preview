# Orginal repo:
[![](https://github.com/lunarwtr/vscode-tga-image-preview/raw/main/icon.png)](https://marketplace.visualstudio.com/items?itemName=lunarwtr.tga-image-preview)

[![](https://img.shields.io/github/license/lunarwtr/vscode-tga-image-preview)](https://opensource.org/licenses/MIT)
[![](https://img.shields.io/github/v/release/lunarwtr/vscode-tga-image-preview)](https://github.com/lunarwtr/vscode-tga-image-preview/releases)
![version](https://vsmarketplacebadge.apphb.com/version-short/lunarwtr.tga-image-preview.svg)
![installs](https://vsmarketplacebadge.apphb.com/installs-short/lunarwtr.tga-image-preview.svg)
![downloads](https://vsmarketplacebadge.apphb.com/downloads-short/lunarwtr.tga-image-preview.svg)

Simple TGA Image (TARGA) Previewer based on Vscode built in [Image Preview extension](https://github.com/microsoft/vscode/tree/main/extensions/image-preview)

# New Features

# TGA Mapped Image Preview - VS Code Extension

This VS Code extension provides a convenient way to preview TGA images, especially those used with texture mapping defined in INI files. It allows you to visualize mapped image regions within the larger TGA texture.

![image](https://github.com/user-attachments/assets/7a9bcd7e-64d4-4a2d-8495-5cc2fd28441b)


## Features

* **TGA Image Preview:** View TGA images directly within the VS Code editor.
* **Mapped Image Highlighting:** See the exact region of the TGA texture that corresponds to a mapped image, defined in your INI configuration files.
* **INI Configuration:** The extension uses INI files to define the mapping between image names and their coordinates within the TGA texture.
* **Configurable INI Folder Path:** You can specify the location of your INI files in the extension settings.

## Requirements

* Visual Studio Code

## Installation

This extension is currently not available through the VS Code Marketplace.  To install it:

1.  **Download:** Download the extension's source code (zip file or clone the repository).
2.  **Extract:** Extract the downloaded files to a convenient location.
3.  **VS Code Extensions Folder:** Locate your VS Code extensions folder.  This is typically found at:
    *   **Windows:** `%USERPROFILE%\.vscode\extensions`
    *   **macOS:** `~/.vscode/extensions`
    *   **Linux:** `~/.vscode/extensions`
4.  **Copy:** Copy the extracted extension folder into the VS Code extensions folder.
5.  **Restart:** Restart VS Code.


## Usage

1.  **Configure INI Folder Path:** Open VS Code settings (File > Preferences > Settings). Search for "TGA Preview Settings". You'll find a setting called "tgaPreview.iniFolderPath". Enter the full path to the folder containing your INI Mapped images files here. The extension will read INI files to understand the mapped images.

2.  **Open a TGA file:** Open a TGA file in VS Code. The extension will automatically render a preview.

3.  **Mapped Image Visualization:** Once the INI path is correctly configured, the extension will show a highlighted region of the TGA texture corresponding to the mapped image if it is defined in the INI file.

## INI File Format

The extension expects INI files with the following format:

```ini
[Mapped Image Section]
MappedImage ImageName1
  Texture = TextureFileName.tga
  TextureWidth = 512
  TextureHeight = 512
  Coords = Left:10 Top:20 Right:100 Bottom:120
End

MappedImage ImageName2
  Texture = AnotherTexture.tga
  TextureWidth = 256
  TextureHeight = 256
  Coords = Left:50 Top:50 Right:150 Bottom:150
End
```

*   `MappedImage`: Indicates the start of a mapped image definition.
*   `ImageName`: The name of the mapped image.
*   `Texture`: The name of the TGA file that contains the texture.
*   `TextureWidth`: Width of the texture.
*   `TextureHeight`: Height of the texture.
*   `Coords`: Coordinates of the mapped image within the TGA texture (Left, Top, Right, Bottom).

## Known Issues

*   **Zoom Level Accuracy:** The accuracy of the highlighted region's position is wrong when the zoom level is different from 100%. This is currently under investigation.
*   **Coordinate Update*: Currently, it is not possible to update the coordinates of the mapped images directly through the extension's interface. This feature is planned for a future release.



## License

This extension is licensed under the MIT License.


## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

