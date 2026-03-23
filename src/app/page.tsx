import { ValidationForm } from "@/components/validation-form";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <ValidationForm />
        <p style={{ textAlign: "center", color: "#6b7280", marginTop: "1rem" }}>
          Internal staff dashboard: <a href="/dashboard">/dashboard</a>
        </p>
      </main>
    </div>
  );
}
