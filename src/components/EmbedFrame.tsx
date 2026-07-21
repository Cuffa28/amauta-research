export default function EmbedFrame({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  return (
    <div className="embed-wrap">
      <iframe
        className="embed-frame"
        src={src}
        title={title}
        allow="clipboard-read; clipboard-write; fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
