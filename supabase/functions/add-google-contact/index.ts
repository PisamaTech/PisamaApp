import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");

async function getAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to refresh access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

serve(async (req) => {
  try {
    const { record } = await req.json();
    const { firstName, lastName, email, phone, profession } = record;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
      });
    }

    const accessToken = await getAccessToken();

    // Format display name: "nombre + apellido + profesion + 'Consultorio'"
    const fullName = `${firstName || ""} ${lastName || ""}`.trim();
    const professionSuffix = profession ? ` ${profession}` : "";
    const displayName = `${fullName}${professionSuffix} Consultorio`.trim();

    const contactBody = {
      names: [
        {
          givenName: firstName || "",
          familyName: `${lastName || ""}${professionSuffix} Consultorio`.trim(),
        },
      ],
      emailAddresses: [
        {
          value: email,
        },
      ],
      phoneNumbers: phone
        ? [
            {
              value: phone,
            },
          ]
        : [],
    };

    const response = await fetch(
      "https://people.googleapis.com/v1/people:createContact",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactBody),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Google API Error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to create contact", details: result }),
        { status: response.status },
      );
    }

    return new Response(JSON.stringify({ success: true, contact: result }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
