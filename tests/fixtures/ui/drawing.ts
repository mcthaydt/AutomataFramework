// A box that changes size is heard by the page only when the page draws a frame, and a test page that has just been
// resized, with nothing animating, can wait a long time for its next one (a frame then says its old size in its new
// box, and a test that waits one second fails once in a while). A test that waits for a frame to measure keeps the page
// drawing meanwhile, and reads how many frames came when it failed.

/** The page drawing a frame at a time until `stop`; `count` is how many it drew. */
export interface Drawing {
  count(): number
  stop(): void
}

export function keepDrawing(): Drawing {
  let drawn = 0
  let next = requestAnimationFrame(function draw() {
    drawn += 1
    next = requestAnimationFrame(draw)
  })
  return { count: () => drawn, stop: () => cancelAnimationFrame(next) }
}
