# astk-extendscripts

My ExtendScript scripts for Adobe Illustrator.

## Installation

```sh
# build
git clone https://github.com/asa-taka/astk-extendscripts
cd astk-extendscripts
npm install
npm run build

# install destination
YOUR_ILLUSTRATOR_SCRIPT_DIR= # e.g. /Applications/Adobe\ Illustrator\ 2022/Presets.localized/en_US/Scripts
ls ${YOUR_ILLUSTRATOR_SCRIPT_DIR} # confirm to exist
DEST="${YOUR_ILLUSTRATOR_SCRIPT_DIR}"/astk-extendscripts

# sudo might be needed
mkdir "${DEST}"
cp dist/* "${DEST}"
```