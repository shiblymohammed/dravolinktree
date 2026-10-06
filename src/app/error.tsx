"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="not-found"><span className="eyebrow">A MOMENT OF PAUSE</span><h1>We’ll be right<br /><em>with you.</em></h1><p>Something didn’t load as expected. Please try again.</p><button className="solid-button" onClick={reset}>Try again</button></main>; }
