import Link from "next/link";

import { AuthPanel } from "./auth-panel";
import styles from "./page.module.css";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const columns = [
  { title: "Backlog", count: 8 },
  { title: "In progress", count: 3 },
  { title: "In review", count: 2 },
];

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const oauthFailed = typeof params.error === "string";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Orbit home">
          <span className={styles.brandMark}>O</span>
          <span>ORBIT</span>
        </Link>
        <span className={styles.status}>Issue command center</span>
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <p className={styles.kicker}>Plan · Assign · Ship</p>
          <h1>Keep work moving without losing the thread.</h1>
          <p className={styles.lede}>
            A focused issue tracker for teams that want the clarity of a board
            and the detail of a proper work log.
          </p>

          <div className={styles.boardPreview} aria-hidden="true">
            {columns.map((column, columnIndex) => (
              <div className={styles.column} key={column.title}>
                <div className={styles.columnHeader}>
                  <span>{column.title}</span>
                  <span>{column.count}</span>
                </div>
                <div className={styles.issueCard}>
                  <span>ORB-{12 + columnIndex}</span>
                  <strong>
                    {columnIndex === 0
                      ? "Create project workspace"
                      : columnIndex === 1
                        ? "Connect activity feed"
                        : "Review access rules"}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <AuthPanel oauthFailed={oauthFailed} />
      </main>

      <footer className={styles.footer}>
        <span>ORBIT / 2026</span>
        <span>Built for accountable work</span>
      </footer>
    </div>
  );
}
