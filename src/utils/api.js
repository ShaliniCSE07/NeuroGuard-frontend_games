// frontend/games/src/utils/api.js

export async function sendResultToBackend(result) {
  result.user_id = result.user_id || "U001"; // Replace with logged-in user later
  
  try {
    const res = await fetch("http://localhost:5000/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    const json = await res.json();
    console.log("✅ Result stored in Neuroguard backend:", json);
    
    if (json.baseline_ready) {
      console.log("✅ Personal baseline updated:", json.baseline);
    }
  } catch (e) {
    console.error("❌ Failed to store result:", e);
  }
}