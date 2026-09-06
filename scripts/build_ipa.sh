#!/bin/bash
set -e

echo "=== 🍎 COMPILANDO Y GENERANDO megaAnime.ipa ==="
export DEVELOPER_DIR="/Users/juanramonbaezcabrera/Downloads/Xcode.app/Contents/Developer"

mkdir -p build/ios
cd /Users/juanramonbaezcabrera/antigravity/megaAnime

echo "1. Archivando proyecto Xcode..."
$DEVELOPER_DIR/usr/bin/xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -archivePath build/ios/megaAnime.xcarchive \
  archive \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO

echo "2. Empaquetando Payload y generando archivo .ipa..."
cd build/ios
rm -rf Payload megaAnime.ipa
mkdir Payload
cp -r megaAnime.xcarchive/Products/Applications/App.app Payload/
zip -r -q megaAnime.ipa Payload
rm -rf Payload

echo "✅ IPA GENERADO EXITOSAMENTE:"
ls -lh megaAnime.ipa
