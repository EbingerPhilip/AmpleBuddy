import React, { useEffect, useState } from "react";

import type { Contact, User } from "../types";

const Homepage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactCount, setContactCount] = useState<number>(0); // Neuer State für contactCount
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  //trigger data Fetching after rendering
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    //fetch Data from backend 
    async function fetchContacts() {
      try {
        setLoading(true);
        setError(null);

        // Verwende den neuen Endpunkt
        const response = await fetch("http://localhost:3000/test/user2/contactCount", { signal });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        // Erweitere den Typ, um contactCount zu berücksichtigen
        const data = (await response.json()) as User & { contactCount: number };

        setContacts(data.Contacts);
        setContactCount(data.contactCount); // contactCount setzen
      } catch (err) {
        if ((err as DOMException).name === "AbortError") {
          // fetch was aborted — ignore
          return;
        }
        console.error("Failed to fetch contacts:", err);
        setError((err as Error).message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();

    // cleanup: cancel the fetch if component unmounts
    return () => {
      controller.abort();
    };
  }, []); // empty dependency array => run once on mount

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div>
      <h2>Contacts</h2>
      <p>Total Contacts, served via module: {contactCount}</p> {/* contactCount anzeigen */}
      <ul>
        {contacts.map(c => (
          <li key={c.userid}>
            <strong>{c.nickname}</strong> ({c.username}) — id: {c.userid}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Homepage;
