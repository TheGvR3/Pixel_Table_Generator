// Selezioni DOM
const container = document.querySelector(".container");
const gridButton = document.getElementById("submit-grid");
const clearGridButton = document.getElementById("clear-grid");
const gridWidth = document.getElementById("width-range");
const gridHeight = document.getElementById("height-range");
const colorInput = document.getElementById("color-input");
const sizeValue = document.getElementById("size-value");
const downloadBtn = document.getElementById("download-btn");

// Bottoni Strumenti
const toolBtns = document.querySelectorAll(".tool-btn");
const paintBtn = document.getElementById("paint-btn");
const eraseBtn = document.getElementById("erase-btn");
const fillBtn = document.getElementById("fill-btn");

// Stato Applicazione
let events = {
    mouse: { down: "mousedown", move: "mousemove", up: "mouseup" },
    touch: { down: "touchstart", move: "touchmove", up: "touchend" },
};
let deviceType = "";
let draw = false;
let currentMode = "paint"; // paint, erase, fill

// Rilevamento Touch
const isTouchDevice = () => {
    try {
        document.createEvent("TouchEvent");
        deviceType = "touch";
        return true;
    } catch (e) {
        deviceType = "mouse";
        return false;
    }
};
isTouchDevice();

// --- GESTIONE GRIGLIA ---
gridButton.addEventListener("click", () => {
    createGrid();
});

function createGrid() {
    container.innerHTML = "";
    const width = gridWidth.value;
    const height = gridHeight.value;
    
    // Aggiorna CSS Grid
    container.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    
    // Creazione celle con coordinate
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let col = document.createElement("div");
            col.classList.add("gridCol");
            col.setAttribute("data-x", x);
            col.setAttribute("data-y", y);
            col.setAttribute("id", `x${x}-y${y}`); // ID univoco per il flood fill
            
            // Eventi Mouse Desktop (Più leggeri di touch)
            col.addEventListener("mousedown", (e) => {
                if(currentMode === "fill") {
                    floodFill(x, y, getColor(col), colorInput.value);
                } else {
                    draw = true;
                    applyColor(col);
                }
            });
            
            col.addEventListener("mouseenter", () => {
                if (draw && currentMode !== "fill") {
                    applyColor(col);
                }
            });

            container.appendChild(col);
        }
    }
}

// Stop disegno globale
document.addEventListener("mouseup", () => draw = false);
document.addEventListener("touchend", () => draw = false);

// Eventi Touch (Globali sul container per performance)
container.addEventListener("touchmove", (e) => {
    if(currentMode === "fill") return; // Niente trascinamento per il fill
    
    e.preventDefault(); // Previene lo scroll
    let touch = e.touches[0];
    let target = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (target && target.classList.contains("gridCol")) {
        applyColor(target);
    }
}, { passive: false });


// --- LOGICA DI DISEGNO ---
function applyColor(element) {
    if (currentMode === "paint") {
        element.style.backgroundColor = colorInput.value;
    } else if (currentMode === "erase") {
        element.style.backgroundColor = "transparent";
    }
}

function getColor(element) {
    return element.style.backgroundColor || "transparent";
}

// --- FLOOD FILL ALGORITHM (Secchiello) ---
function floodFill(startX, startY, targetColor, replacementColor) {
    // Se il colore è lo stesso, non fare nulla
    if (targetColor === replacementColor) return;
    
    // Se target è transparent e replacement è hex, dobbiamo normalizzare per confronto
    // Ma qui lavoriamo direttamente con gli stili computed o inline.
    // Facciamo una DFS (Depth First Search) o BFS.
    
    const stack = [[startX, startY]];
    const width = parseInt(gridWidth.value);
    const height = parseInt(gridHeight.value);

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const el = document.getElementById(`x${x}-y${y}`);
        
        if (!el) continue;
        
        const currentColor = el.style.backgroundColor || "transparent";

        // Convertiamo per confronto sicuro (i browser ritornano rgb(...) anche se setti hex)
        // Per semplicità qui confrontiamo la stringa esatta se settata, o assumiamo match se è l'inizio
        // Nota: Questo è un fill di base. Per produzione servirebbe conversione RGB <-> HEX.
        
        // Semplificazione: se abbiamo appena iniziato, targetColor è quello che abbiamo cliccato.
        // Se il colore corrente non è targetColor, salta.
        if (currentColor !== targetColor) continue;

        // Colora
        el.style.backgroundColor = replacementColor;

        // Aggiungi vicini
        if (x + 1 < width) stack.push([x + 1, y]);
        if (x - 1 >= 0) stack.push([x - 1, y]);
        if (y + 1 < height) stack.push([x, y + 1]);
        if (y - 1 >= 0) stack.push([x, y - 1]);
    }
}


// --- GESTIONE STRUMENTI ---
toolBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        // Rimuovi active da tutti
        toolBtns.forEach(b => b.classList.remove("active"));
        // Aggiungi a questo
        btn.classList.add("active");
        
        // Setta modo
        if (btn.id === "paint-btn") currentMode = "paint";
        if (btn.id === "erase-btn") currentMode = "erase";
        if (btn.id === "fill-btn") currentMode = "fill";
    });
});

clearGridButton.addEventListener("click", () => {
    container.innerHTML = "";
    createGrid(); // Ricrea pulita
});

// Update Slider Text
[gridWidth, gridHeight].forEach(range => {
    range.addEventListener("input", () => {
        sizeValue.textContent = `${gridWidth.value}x${gridHeight.value}`;
    });
});

// 1. Seleziona il nuovo bottone
const gridToggleBtn = document.getElementById("grid-toggle-btn");

// 2. Aggiungi l'evento click
gridToggleBtn.addEventListener("click", () => {
    // Aggiunge o toglie la classe CSS che nasconde le linee
    container.classList.toggle("hide-grid");
    
    // (Opzionale) Cambia l'icona per dare feedback visivo
    const icon = gridToggleBtn.querySelector("i");
    if (container.classList.contains("hide-grid")) {
        gridToggleBtn.classList.add("active"); // Il bottone resta "premuto"
        icon.classList.replace("fa-border-all", "fa-border-none"); // Cambia icona in "nessun bordo"
    } else {
        gridToggleBtn.classList.remove("active");
        icon.classList.replace("fa-border-none", "fa-border-all"); // Torna icona griglia
    }
});


// --- EXPORT IMAGE ---
downloadBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const w = parseInt(gridWidth.value);
    const h = parseInt(gridHeight.value);
    const cellSize = 20; // Dimensione pixel nell'immagine export

    canvas.width = w * cellSize;
    canvas.height = h * cellSize;

    // Disegna sfondo trasparente o bianco (opzionale)
    // ctx.fillStyle = "#ffffff"; 
    // ctx.fillRect(0,0, canvas.width, canvas.height);

    const cells = document.querySelectorAll(".gridCol");
    cells.forEach(cell => {
        const x = parseInt(cell.getAttribute("data-x"));
        const y = parseInt(cell.getAttribute("data-y"));
        const color = cell.style.backgroundColor;

        if (color && color !== "transparent") {
            ctx.fillStyle = color;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    });

    // Download Trigger
    const link = document.createElement("a");
    link.download = "pixel-art.png";
    link.href = canvas.toDataURL();
    link.click();
});

// Init
window.onload = () => {
    gridWidth.value = 20;
    gridHeight.value = 20;
    sizeValue.textContent = "20x20";
    createGrid();
};