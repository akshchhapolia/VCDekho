export default function UnlockEmailButton({ slug }: { slug: string }) {
  return (
    <a
      className="inv-email-unlock-btn"
      href={'/login#/investors/' + slug}
      data-unlock-email
      data-person-slug={slug}
    >
      <svg
        className="inv-email-unlock-icon"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
        <path
          d="M8 11V8a4 4 0 0 1 8 0v3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="inv-email-unlock-label">Unlock email</span>
    </a>
  );
}
