let currentThreadId = localStorage.getItem("travel_thread_id") || null;
let latestAnswerMarkdown = "";

function setPrompt(text) {
    document.getElementById("userInput").value = text;
}

function setLoading(isLoading) {
    const sendBtn = document.getElementById("sendBtn");
    const btnText = document.getElementById("btnText");
    const btnLoader = document.getElementById("btnLoader");

    sendBtn.disabled = isLoading;

    if (isLoading) {
        btnText.classList.add("hidden");
        btnLoader.classList.remove("hidden");
    } else {
        btnText.classList.remove("hidden");
        btnLoader.classList.add("hidden");
    }
}

function showError(message) {
    const errorBox = document.getElementById("errorBox");

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function hideError() {
    const errorBox = document.getElementById("errorBox");

    errorBox.classList.add("hidden");
    errorBox.textContent = "";
}

function showResult(answer, threadId) {
    latestAnswerMarkdown = answer;

    const resultSection = document.getElementById("resultSection");
    const resultBox = document.getElementById("resultBox");
    const threadInfo = document.getElementById("threadInfo");

    if (typeof marked !== "undefined") {
        resultBox.innerHTML = marked.parse(answer);
    } else {
        resultBox.innerText = answer;
    }

    threadInfo.textContent = `Thread ID: ${threadId}`;

    resultSection.classList.remove("hidden");

    resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

let progressInterval = null;
let currentProgress = 0;

function startProgress() {
    const container = document.getElementById("progressContainer");
    const bar = document.getElementById("progressBar");
    const percent = document.getElementById("progressPercent");
    const status = document.getElementById("progressStatus");

    const stepFlight = document.getElementById("step-flight");
    const stepHotel = document.getElementById("step-hotel");
    const stepItinerary = document.getElementById("step-itinerary");
    const stepFinal = document.getElementById("step-final");

    // Reset badges
    [stepFlight, stepHotel, stepItinerary, stepFinal].forEach(el => {
        if (el) el.className = "agent-step-badge";
    });

    currentProgress = 0;
    bar.style.width = "0%";
    percent.textContent = "0%";
    status.textContent = "🛫 Agent 1/4: Analyzing route & searching flights...";
    if (stepFlight) stepFlight.classList.add("active");

    container.classList.remove("hidden");

    const startTime = Date.now();

    if (progressInterval) clearInterval(progressInterval);

    progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        let target = 0;
        let message = "";

        if (elapsed < 3) {
            // Stage 1: Flight Agent (0% - 25%)
            target = Math.min(25, Math.floor(elapsed * 8.3));
            message = "🛫 Agent 1/4: Analyzing route & searching live flights (AviationStack)...";
            if (stepFlight) stepFlight.className = "agent-step-badge active";
        } else if (elapsed < 6.5) {
            // Stage 2: Hotel Agent (25% - 50%)
            target = Math.min(50, 25 + Math.floor((elapsed - 3) * 7.1));
            message = "🏨 Agent 2/4: Discovering top hotels, rooms & locations (Tavily AI)...";
            if (stepFlight) stepFlight.className = "agent-step-badge completed";
            if (stepHotel) stepHotel.className = "agent-step-badge active";
        } else if (elapsed < 11.5) {
            // Stage 3: Itinerary Agent (50% - 75%)
            target = Math.min(75, 50 + Math.floor((elapsed - 6.5) * 5.0));
            message = "🗺️ Agent 3/4: Synthesizing day-by-day itinerary & budgeting (Groq LLM)...";
            if (stepHotel) stepHotel.className = "agent-step-badge completed";
            if (stepItinerary) stepItinerary.className = "agent-step-badge active";
        } else if (elapsed < 16) {
            // Stage 4: Final Synthesis Agent (75% - 95%)
            target = Math.min(95, 75 + Math.floor((elapsed - 11.5) * 4.4));
            message = "✨ Agent 4/4: Polishing final report, recommendations & formatting...";
            if (stepItinerary) stepItinerary.className = "agent-step-badge completed";
            if (stepFinal) stepFinal.className = "agent-step-badge active";
        } else {
            // Stage 5: Finalizing (95% - 98%)
            target = Math.min(98, 95 + Math.floor((elapsed - 16) * 0.5));
            message = "🎉 Finalizing: Assembling your complete travel plan...";
            if (stepFinal) stepFinal.className = "agent-step-badge active";
        }

        if (currentProgress < target) {
            currentProgress = target;
        }

        bar.style.width = `${currentProgress}%`;
        percent.textContent = `${currentProgress}%`;
        status.textContent = message;
    }, 180);
}

function completeProgress(callback) {
    if (progressInterval) clearInterval(progressInterval);

    const bar = document.getElementById("progressBar");
    const percent = document.getElementById("progressPercent");
    const status = document.getElementById("progressStatus");
    const stepFinal = document.getElementById("step-final");

    if (stepFinal) stepFinal.className = "agent-step-badge completed";

    currentProgress = 100;
    bar.style.width = "100%";
    percent.textContent = "100%";
    status.textContent = "✅ Complete! Your travel plan is ready.";

    setTimeout(() => {
        const container = document.getElementById("progressContainer");
        if (container) container.classList.add("hidden");
        if (callback) callback();
    }, 600);
}

function resetProgress() {
    if (progressInterval) clearInterval(progressInterval);
    const container = document.getElementById("progressContainer");
    if (container) container.classList.add("hidden");
}

async function sendMessage() {
    hideError();

    const input = document.getElementById("userInput");
    const message = input.value.trim();

    if (!message) {
        showError("Please enter your travel request first.");
        return;
    }

    setLoading(true);
    startProgress();

    try {
        const response = await fetch("/api/travel", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                thread_id: currentThreadId
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Something went wrong.");
        }

        currentThreadId = data.thread_id;
        localStorage.setItem("travel_thread_id", currentThreadId);

        completeProgress(() => {
            showResult(data.answer, data.thread_id);
        });

    } catch (error) {
        resetProgress();
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

function copyResult() {
    const resultBox = document.getElementById("resultBox");
    const text = resultBox.innerText;

    if (!text) {
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => {
            const copyBtn = document.querySelector(".copy-btn");
            const oldText = copyBtn.textContent;

            copyBtn.textContent = "Copied!";

            setTimeout(() => {
                copyBtn.textContent = oldText;
            }, 1400);
        })
        .catch(() => {
            showError("Could not copy result.");
        });
}

function downloadPDF() {
    const pdfContent = document.getElementById("pdfContent");

    if (!latestAnswerMarkdown || !pdfContent) {
        showError("No travel plan available to download.");
        return;
    }

    const downloadBtn = document.querySelector(".download-btn");
    const oldText = downloadBtn.textContent;

    downloadBtn.textContent = "Preparing PDF...";
    downloadBtn.disabled = true;

    const options = {
        margin: 0.5,
        filename: "ai-travel-plan.pdf",
        image: {
            type: "jpeg",
            quality: 0.98
        },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
        },
        jsPDF: {
            unit: "in",
            format: "a4",
            orientation: "portrait"
        },
        pagebreak: {
            mode: ["avoid-all", "css", "legacy"]
        }
    };

    html2pdf()
        .set(options)
        .from(pdfContent)
        .save()
        .then(() => {
            downloadBtn.textContent = oldText;
            downloadBtn.disabled = false;
        })
        .catch(() => {
            downloadBtn.textContent = oldText;
            downloadBtn.disabled = false;
            showError("Could not download PDF.");
        });
}

document.addEventListener("keydown", function(event) {
    if (event.ctrlKey && event.key === "Enter") {
        sendMessage();
    }
});