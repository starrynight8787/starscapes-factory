import { doorsOf, doorPath, doorArt } from './doorsData'

// Takes a room's scene and opens the doors that are open: the taped-off door becomes a link to its page, with its untaped picture and its new line.
// A door that is closed, or has no page yet, is left exactly as it was. The scene it is given is not changed.
export function applyDoors(scene, room, isOpen) {
  const doors = doorsOf(room)
  if (doors.length === 0) return scene
  return {
    ...scene,
    items: scene.items.map((item) => {
      const door = doors.find((d) => d.id === item.id)
      if (!door || !door.page || item.kind !== 'locked' || !isOpen(room, door.id)) return item
      const { lock, ...rest } = item // eslint-disable-line no-unused-vars
      return { ...rest, kind: 'page', to: doorPath(door), art: doorArt(door), blurb: door.blurb }
    }),
  }
}
