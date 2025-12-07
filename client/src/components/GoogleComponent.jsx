import { useEffect } from "react";
import axios from "axios";

export default function GoogleButton({ onSuccess }) {
  const handleCredential = async (response) => {
    try {
      const { data } = await axios.post(
        "http://draftig.onrender.com/api/auth/google",
        { credential: response.credential }
      );
      onSuccess(data);
    } catch (err) {
      console.log(err);
      alert("Google login failed");
    }
  };

  useEffect(() => {
    /* global google */
    if (!window.google) return;

    google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredential,
    });

    google.accounts.id.renderButton(
      document.getElementById("googleBtn"),
      {
        theme: "outline",
        size: "large",
        width: "350",
      }
    );
  }, []);

  return <div id="googleBtn"></div>;
}
