// The ONE image a room picture may hold: the Story Ledger logo on the TV screen (added 21 October 2026). It is stored INSIDE the picture as a data: address, so nothing is
// ever fetched from anywhere, it is marked data-logo="1", and it is clipped to the screen. The picture tests take exactly this tag out before they check that a picture
// is "only a drawing": any other image, script, link or outside address is still refused. test/picture-logo.test.js keeps the exception this narrow.
export const LOGO = /<image data-logo="1" href="data:image\/webp;base64,[A-Za-z0-9+/=]+"(?: [a-zA-Z-]+="[^"]*")* \/>/g
export const LOGO_MAX_DATA = 12000 // the most characters of picture data the logo may hold (it is about 5,300 now), so the pictures stay light
// The only other one: the photo of the bear and dinosaur in the Clubhouse wall frame (added 21 October 2026), kept inside sarah-jrs-den/base.svg in the same narrow shape.
export const PHOTO = /<image data-photo="1" href="data:image\/webp;base64,[A-Za-z0-9+/=]+"(?: [a-zA-Z-]+="[^"]*")* ?\/>/g
export const PHOTO_MAX_DATA = 60000
export const withoutLogo = (name, svg) => {
  const s = String(svg)
  if (/story-ledger/.test(String(name))) return s.replace(LOGO, '')
  if (/sarah-jrs-den[\\/]base\.svg$|^base\.svg$/.test(String(name)) && /data-photo="1"/.test(s)) return s.replace(PHOTO, '')
  return s
}
