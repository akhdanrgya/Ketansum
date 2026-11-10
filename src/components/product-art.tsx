const crops = [
  [80, 310, 285, 315],
  [420, 270, 285, 320],
  [85, 710, 300, 320],
  [470, 665, 300, 320],
  [90, 1105, 325, 285],
  [450, 1110, 320, 275],
];
export function ProductArt({
  art,
  name,
  image,
}: {
  art: number;
  name: string;
  image?: string;
}) {
  const [x, y, w, h] = crops[art] || crops[0];
  return (
    <div
      className="product-art"
      role="img"
      aria-label={name}
      style={
        image
          ? {
              backgroundImage: `url("${image}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { aspectRatio: `${w}/${h}` }
      }
    >
      {!image && (
        <img
          src="/poster-ketansum.jpg"
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            maxWidth: "none",
            width: `${(900 / w) * 100}%`,
            height: `${(1600 / h) * 100}%`,
            left: `${(-x / w) * 100}%`,
            top: `${(-y / h) * 100}%`,
          }}
        />
      )}
    </div>
  );
}
