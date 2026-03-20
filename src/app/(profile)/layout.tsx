import ProfileNav from "./ProfileNav";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "2.5rem 1.5rem",
        }}
      >
        <ProfileNav />
        {children}
      </div>
    </div>
  );
}
