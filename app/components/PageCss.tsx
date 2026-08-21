const HOME = (
  <>
    <link rel="stylesheet" href="/css/hero.css?v=97" />
    <link rel="stylesheet" href="/css/ambient.css?v=98" />
    <link rel="stylesheet" href="/css/announcement.css?v=145" />
  </>
);

export function HomeCss() {
  return HOME;
}

export function DirectoryCss() {
  return (
    <>
      {HOME}
      <link rel="stylesheet" href="/css/directory-list.css?v=145" />
    </>
  );
}

export function ProfileCss() {
  return (
    <>
      {HOME}
      <link rel="stylesheet" href="/css/directory-list.css?v=145" />
      <link rel="stylesheet" href="/css/directory-profile.css?v=145" />
    </>
  );
}
