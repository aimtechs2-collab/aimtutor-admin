import { getTeamsMsalInstance } from "./teams-msal";

export async function createTeamsMeeting({
  subject,
  startTime,
  endTime,
  recordAutomatically,
  attendees = [],
}: {
  subject: string;
  startTime: string;
  endTime: string;
  recordAutomatically: boolean;
  attendees?: string[];
}) {
  const msal = getTeamsMsalInstance();
  if (!msal) throw new Error("MSAL not available");
  const account = msal.getActiveAccount();
  if (!account) throw new Error("No active account found");

  const accessToken = await msal
    .acquireTokenSilent({
      scopes: ["Calendars.ReadWrite", "OnlineMeetings.ReadWrite"],
      account,
    })
    .then((res) => res.accessToken);

  // 1️⃣ Create the Teams meeting
  const meetingRes = await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDateTime: startTime,
      endDateTime: endTime,
      recordAutomatically,
      subject,
    }),
  });

  const meeting = await meetingRes.json();
  if (!meeting?.joinUrl) throw new Error("Failed to create Teams meeting");

  // 2️⃣ Create a calendar event for the meeting
  const eventRes = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
      start: { dateTime: startTime, timeZone: "India Standard Time" },
      end: { dateTime: endTime, timeZone: "India Standard Time" },
      location: { displayName: "Microsoft Teams" },
      attendees: attendees.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      })),
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
      body: {
        contentType: "HTML",
        content: `Click <a href='${meeting.joinUrl}'>here</a> to join the meeting.`,
      },
    }),
  });

  const event = await eventRes.json();
  return { meeting, event };
}

