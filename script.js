// Enhanced Chart.js and plugin initialization with proper dependency loading
let chartDependenciesLoaded = false;
let chartInstance = null;

// Function to check and register Chart.js plugins
function initializeChartDependencies() {
  return new Promise((resolve, reject) => {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
      reject(new Error('Chart.js no está disponible'));
      return;
    }
    
    console.log('Chart.js version:', Chart.version);
    
    // Register ChartDataLabels plugin if available
    if (typeof ChartDataLabels !== 'undefined') {
      try {
        // Register the plugin globally
        Chart.register(ChartDataLabels);
        console.log('ChartDataLabels plugin registrado correctamente');
        chartDependenciesLoaded = true;
        resolve(true);
      } catch (error) {
        console.warn('Error registrando ChartDataLabels:', error);
        // Try alternative registration method
        try {
          Chart.plugins.register(ChartDataLabels);
          console.log('ChartDataLabels plugin registrado con método alternativo');
          chartDependenciesLoaded = true;
          resolve(true);
        } catch (altError) {
          console.warn('Error con método alternativo:', altError);
        chartDependenciesLoaded = true;
        resolve(false);
        }
      }
    } else {
      console.warn('ChartDataLabels no está disponible, continuando sin etiquetas de datos');
      chartDependenciesLoaded = true;
      resolve(false);
    }
  });
}

// Remove font loading block
window.addEventListener("error", function (e) {
  console.error("Resource loading error:", e.target.src || e.target.href);
});

// Configuration objects
const APP_CONFIG = {
  navigationFlow: {
    "index.html": "instrucciones.html",
    "instrucciones.html": "seccion_uno.html",
    "seccion_uno.html": "seccion_dos.html",
    "seccion_dos.html": "seccion_tres.html",
    "seccion_tres.html": "seccion_cuatro.html",
    "seccion_cuatro.html": "seccion_cinco.html",
    "seccion_cinco.html": "seccion_seis.html",
    "seccion_seis.html": "seccion_siete.html",
    "seccion_siete.html": "resultados.html",
    "resultados.html": "index.html",
  },
  formConfig: {
    seccion1Form: {
      questions: 5,
      nextPage: "seccion_dos.html",
      title: "1. GOBIERNO Y CUMPLIMIENTO NORMATIVO",
    },
    seccion2Form: {
      questions: 5,
      nextPage: "seccion_tres.html",
      title: "2. GESTIÓN DE CONSENTIMIENTOS",
    },
    seccion3Form: {
      questions: 5,
      nextPage: "seccion_cuatro.html",
      title: "3. MEDIDAS DE SEGURIDAD",
    },
    seccion4Form: {
      questions: 5,
      nextPage: "seccion_cinco.html",
      title: "4. DERECHOS DE LOS TITULARES",
    },
    seccion5Form: {
      questions: 5,
      nextPage: "seccion_seis.html",
      title: "5. TRANSFERENCIAS DE DATOS",
    },
    seccion6Form: {
      questions: 5,
      nextPage: "seccion_siete.html",
      title: "6. GESTIÓN DE PROVEEDORES Y TERCEROS",
    },
    seccion7Form: {
      questions: 5,
      nextPage: "resultados.html",
      title: "7. GESTIÓN DE INCIDENTES Y CONTINUIDAD",
    },
  },
};

class PDFGenerator {
  static async generatePDF() {
    try {
      console.log("Iniciando generación de PDF...");
      
      // Validate dependencies
      if (!this._validateDependencies()) {
        throw new Error("Dependencias del PDF no están disponibles");
      }

      // Get chart image
      const chartImage = await this._getChartImage();
      if (!chartImage) {
        console.warn("No se pudo obtener la imagen del gráfico, continuando sin ella");
      }

      // Create PDF document
      const doc = new (window.jspdf?.jsPDF || jsPDF || window.jsPDF)();
      
      console.log("PDF generado exitosamente");
      
      // Create comprehensive multi-page format
      await this._createFirstPage(doc);
      this._createSecondPage(doc, chartImage);
      
      // Add headers and page numbers
      this._addHeadersAndPageNumbers(doc);

      return doc;
      
    } catch (error) {
      console.error("Error en generatePDF:", error);
      throw new Error(`Error generando PDF: ${error.message}`);
    }
  }

  static _validateDependencies() {
    // Check jsPDF with multiple possible loading methods
    let jsPDFAvailable = false;
    if (typeof window.jspdf !== "undefined" && window.jspdf.jsPDF) {
      jsPDFAvailable = true;
    } else if (typeof jsPDF !== "undefined") {
      jsPDFAvailable = true;
    } else if (typeof window.jsPDF !== "undefined") {
      jsPDFAvailable = true;
    }
    
    if (!jsPDFAvailable) {
      throw new Error(
        "jsPDF no está disponible o no se ha cargado correctamente. Verifique su conexión a internet."
      );
    }

    // Check canvas element with more detailed validation
    const canvas = document.getElementById("graficoResultados");
    if (!canvas) {
      console.error("Canvas validation failed. DOM state:", {
        readyState: document.readyState,
        bodyExists: !!document.body,
        canvasElements: document.querySelectorAll('canvas').length,
        graficoElement: !!document.getElementById("graficoResultados")
      });
      throw new Error("No se encontró el elemento canvas para el gráfico. Asegúrese de que el gráfico se haya generado correctamente.");
    }
    
    if (!(canvas instanceof HTMLCanvasElement)) {
      console.error("Element found but not a canvas:", {
        elementType: canvas.constructor.name,
        tagName: canvas.tagName,
        id: canvas.id
      });
      throw new Error("El elemento encontrado no es un canvas válido");
    }

    // Check if chart has been rendered with more detailed validation
    if (!chartInstance) {
      console.error("Chart instance validation failed:", {
        chartInstance: chartInstance,
        chartType: typeof Chart,
        canvasContext: !!canvas.getContext('2d')
      });
      throw new Error("El gráfico no ha sido inicializado. Por favor, espere a que se cargue completamente.");
    }
    
    // Validate chart instance is actually a Chart
    if (typeof Chart !== 'undefined' && !(chartInstance instanceof Chart)) {
      console.error("Invalid chart instance:", {
        instanceType: typeof chartInstance,
        constructor: chartInstance?.constructor?.name
      });
      throw new Error("La instancia del gráfico no es válida.");
    }

    // Validate user data
    const usuario = JSON.parse(localStorage.getItem("usuarioData") || "{}");
    if (!usuario.email) {
      console.warn("No se encontró email del usuario en localStorage");
    }

    // Validate results data with more detailed checks
    const resultados = JSON.parse(localStorage.getItem("resultadosCalculados") || "{}");
    if (!resultados.nivelRiesgo || typeof resultados.porcentajeTotal !== 'number') {
      console.error("Results validation failed:", {
        hasNivelRiesgo: !!resultados.nivelRiesgo,
        porcentajeTotalType: typeof resultados.porcentajeTotal,
        porcentajeTotal: resultados.porcentajeTotal,
        resultadosKeys: Object.keys(resultados)
      });
      throw new Error("Los datos de resultados no están completos. Por favor, complete todas las secciones del cuestionario.");
    }

    console.log("Todas las dependencias del PDF validadas correctamente");
    return true;
  }

  static _getChartImage() {
    const canvas = document.getElementById("graficoResultados");
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error("No se encontró el canvas para el gráfico o no es válido");
    }
    
    try {
      // Ensure the chart is fully rendered with labels
      if (chartInstance) {
        // Force a re-render to ensure labels are visible
        chartInstance.update('none'); // Update without animation
        
        // If datalabels plugin is not working, manually draw the labels
        this._ensureChartLabelsVisible(canvas, chartInstance);
        
        // Wait a moment for any pending renders
        return new Promise((resolve) => {
          setTimeout(() => {
            try {
              const imageData = canvas.toDataURL("image/png");
              resolve(imageData);
    } catch (error) {
      console.error("Error al convertir gráfico a imagen:", error);
              resolve(null); // Return null instead of throwing
            }
          }, 100);
        });
      }
      
      // If no chart instance, return the canvas directly as a promise
      return Promise.resolve(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error("Error al convertir gráfico a imagen:", error);
      return Promise.resolve(null); // Return null instead of throwing
    }
  }

  static _ensureChartLabelsVisible(canvas, chart) {
    const ctx = canvas.getContext('2d');
    
    // Check if datalabels are already visible
    const hasDataLabels = chart.options.plugins && 
                         chart.options.plugins.datalabels && 
                         chart.options.plugins.datalabels.display;
    
    if (!hasDataLabels) {
      console.log('Dibujando etiquetas manualmente para el PDF');
      
      // Save current context
      ctx.save();
      
      // Set font and style for labels
      ctx.font = 'bold 16px Aptos, Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      
      // Draw percentage labels on each bar
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar, index) => {
          const value = dataset.data[index];
          const x = bar.x;
          const y = bar.y - 8; // Position above the bar
          
          // Draw text with stroke for better visibility
          ctx.strokeText(value + '%', x, y);
          ctx.fillText(value + '%', x, y);
        });
      });
      
      // Restore context
      ctx.restore();
    }
  }

  static async _createFirstPage(doc) {
    // Header with gray background
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, 210, 30, 'F');
    
    // Add Agencia 43 logo to top right corner
    try {
      const logoBase64 = await this._getLogoBase64();
      if (logoBase64) {
        // Position logo in top right corner of grey rectangle
        // Logo dimensions: width=25, height=20 to fit within the 30px height rectangle
        doc.addImage(logoBase64, 'PNG', 175, 5, 25, 20);
      }
    } catch (error) {
      console.warn('Error adding logo to PDF:', error);
    }
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("INFORME DE EVALUACIÓN", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("Protección de Datos Personales", 105, 25, { align: "center" });
    
    // User and company information
    const usuario = JSON.parse(localStorage.getItem("usuarioData") || "{}");
    const resultados = JSON.parse(localStorage.getItem("resultadosCalculados") || "{}");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // User information section - add more space after grey rectangle
    let yPos = 38; // Increased from 33 to 38 for more space after grey rectangle
    doc.setFont("helvetica", "bold");
    doc.text("Elaborado por:", 20, yPos);
    doc.setFont("helvetica", "normal");
    const nombreCompleto = usuario.nombre && usuario.apellido ? `${usuario.nombre} ${usuario.apellido}` : 'Cristian Yerovi';
    doc.text(nombreCompleto, 70, yPos);
    
    yPos += 3.5;
    doc.setFont("helvetica", "bold");
    doc.text("Correo electrónico:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(usuario.email || 'cristianyerovi+9gcg1uvo@gmail.com', 70, yPos);
    
    yPos += 3.5;
    doc.setFont("helvetica", "bold");
    doc.text("Empresa:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(usuario.empresa || 'Dato integro', 70, yPos);

    yPos += 3.5;
    doc.setFont("helvetica", "bold");
    doc.text("Fecha:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString('es-ES'), 70, yPos);
    
    // Overall result box - add more space before score rectangle
    yPos += 8; // Increased from 5 to 8 for more space before score rectangle
    const porcentajeTotal = resultados.porcentajeTotal || 70;
    const puntuacionTotal = resultados.puntuacionTotal || 73;
    const nivelRiesgo = this._determineRiskLevel(porcentajeTotal);
    const colorRiesgo = this._getRiskColor(nivelRiesgo);
    
    // Create highlighted result box - very small
    doc.setFillColor(colorRiesgo.r, colorRiesgo.g, colorRiesgo.b);
    doc.rect(20, yPos, 170, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(nivelRiesgo.toUpperCase(), 105, yPos + 6, { align: "center" });
    doc.setFontSize(9);
    doc.text(`Nivel de cumplimiento: ${Math.round(porcentajeTotal)}%`, 105, yPos + 13, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    
    // Start content with more space after result box
    yPos += 25; // Increased from 20 to 25 for more space after score rectangle
    
    // 1. Alcance de la evaluación - compact version
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("1. Alcance de la evaluación:", 20, yPos);
    yPos += 5;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const alcanceText = "La presente evaluación preliminar básica abarca la revisión del cumplimiento en materia de protección de datos personales en posición de la organización. El alcance comprende la evaluación de siete dimensiones fundamentales: (1) gobierno y cumplimiento normativo, (2) gestión de consentimientos, (3) medidas de seguridad, (4) derechos de los titulares, (5) transferencias de datos, (6) gestión de proveedores y terceros, y (7) gestión de incidentes y continuidad.";
    const alcanceLines = doc.splitTextToSize(alcanceText, 170);
    
    // Put alcance text with tighter line spacing
    doc.text(alcanceLines, 20, yPos);
    yPos += alcanceLines.length * 3.5 + 6; // Much tighter line spacing
    
    // 2. Resultados por sección - start on first page
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("2. Resultados por sección:", 20, yPos);
    yPos += 6;
    
    // Store where we are for second page continuation
    this._firstPageResultsPosition = yPos;
    this._section2StartedOnFirstPage = true;
    
    // Try to fit the results table on first page
    const pageHeight = 280;
    const remainingSpace = pageHeight - yPos - 15; // Leave small bottom margin
    
    // Calculate table height needed
    const tableHeaderHeight = 6;
    const tableRowHeight = 5;
    const totalRowHeight = 5;
    const tableHeight = tableHeaderHeight + (7 * tableRowHeight) + totalRowHeight + 4; // 7 sections + total + spacing
    
    if (remainingSpace >= tableHeight) {
      // Put table on first page
      this._addResultsTable(doc, yPos, resultados, porcentajeTotal);
      this._tableOnFirstPage = true;
    } else {
      // Mark that table goes to second page
      this._tableOnFirstPage = false;
    }
  }

  static async _getLogoBase64() {
    try {
      const response = await fetch('./img/agencia43final.png');
      if (!response.ok) {
        throw new Error(`Failed to fetch logo: ${response.status}`);
      }
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Error loading logo:', error);
      return null;
    }
  }
  
  static _addResultsTable(doc, yPos, resultados, porcentajeTotal) {
    const secciones = [
      "1. Gobierno y Cumplimiento Normativo",
      "2. Gestión de Consentimientos", 
      "3. Medidas de Seguridad",
      "4. Derechos de los Titulares",
      "5. Transferencias de Datos",
      "6. Gestión de Proveedores y Terceros",
      "7. Gestión de Incidentes y Continuidad"
    ];
    
    // Table headers - compact
    doc.setFillColor(220, 220, 220);
    doc.rect(20, yPos, 170, 6, 'F');
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Sección", 25, yPos + 4);
    doc.text("Porcentaje", 160, yPos + 4);
    yPos += 6;
    
    // Table rows - compact
    const demoScores = [10, 10, 13, 7, 12, 10, 11];
    doc.setFont("helvetica", "normal");
    secciones.forEach((seccion, index) => {
      const puntuacion = resultados.puntuacionesPorSeccion ? resultados.puntuacionesPorSeccion[index] : demoScores[index];
      const porcentaje = Math.round((puntuacion / 15) * 100);
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, yPos, 170, 5, 'F');
      }
      
      doc.text(seccion, 25, yPos + 3.5);
      doc.text(`${porcentaje}%`, 165, yPos + 3.5);
      yPos += 5;
    });
    
    // Total score - compact
    yPos += 1;
    doc.setFillColor(200, 200, 200);
    doc.rect(20, yPos, 170, 6, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 25, yPos + 4);
    doc.text(`${Math.round(porcentajeTotal)}%`, 165, yPos + 4);
    
    return yPos + 6;
  }

  static _createSecondPage(doc, chartImage) {
    doc.addPage();
    
    let yPos = 20;
    const pageHeight = 280;
    const resultados = JSON.parse(localStorage.getItem("resultadosCalculados") || "{}");
    const porcentajeTotal = resultados.porcentajeTotal || 70;
    const nivelRiesgo = this._determineRiskLevel(porcentajeTotal);
    
    // Helper function to check if we need a new page
    const checkPageBreak = (neededSpace) => {
      if (yPos + neededSpace > pageHeight) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };
    
    // Add chart if available
    if (chartImage) {
      try {
        checkPageBreak(80);
        doc.addImage(chartImage, 'PNG', 20, yPos, 170, 65);
        yPos += 70;
      } catch (error) {
        console.warn('Error adding chart to PDF:', error);
        yPos += 10;
      }
    }
    
    // Add results table if it wasn't on first page
    if (!this._tableOnFirstPage) {
      checkPageBreak(80);
      yPos = this._addResultsTable(doc, yPos, resultados, porcentajeTotal);
      yPos += 10;
    }
    
    // 3. Situación actual
    checkPageBreak(40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("3. Situación actual:", 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const situacionText = this._getSituacionActual(nivelRiesgo);
    const situacionLines = doc.splitTextToSize(situacionText, 170);
    
    // Check if situation text fits on current page
    if (yPos + situacionLines.length * 4 > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.text(situacionLines, 20, yPos);
    yPos += situacionLines.length * 4 + 10;
    
    // 4. Repercusiones principales
    checkPageBreak(60);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("4. Repercusiones principales:", 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const repercusiones = this._getRepercusionesPrincipales(nivelRiesgo);
    repercusiones.forEach(rep => {
      const lines = doc.splitTextToSize(rep, 165);
      
      // Check if this item fits on current page
      if (yPos + lines.length * 4 > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(lines, 25, yPos);
      yPos += lines.length * 4 + 4;
    });
    yPos += 6;
    
    // 5. Acciones prioritarias
    checkPageBreak(80);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("5. Acciones prioritarias:", 20, yPos);
    yPos += 8;
    
    // Draw actions table
    const accionesData = this._getAccionesPrioritarias(nivelRiesgo);
    
    // Check if table fits on current page
    if (yPos + (accionesData.length * 8) + 20 > pageHeight) {
      doc.addPage();
      yPos = 20;
    }
    
    this._drawTable(doc, 20, yPos, accionesData);
    yPos += (accionesData.length * 8) + 10;
    
    // 6. Recomendaciones inmediatas
    checkPageBreak(60);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("6. Recomendaciones inmediatas:", 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const recomendaciones = this._getRecomendacionesInmediatas(nivelRiesgo);
    recomendaciones.forEach(rec => {
      const lines = doc.splitTextToSize(rec, 165);
      
      // Check if this item fits on current page
      if (yPos + lines.length * 4 > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(lines, 25, yPos);
      yPos += lines.length * 4 + 4;
    });
    yPos += 6;
    
    // 7. Observaciones
    checkPageBreak(60);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("7. Observaciones:", 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const observacionesText = "Es fundamental mantener un programa de revisión continua y actualización de medidas de protección de datos personales. Es necesario enfatizar la importancia crítica de documentar todas las acciones y decisiones tomadas en materia de protección de datos. Para la completa gestión legal para el cumplimiento normativo, se recomienda contratar asesoría especializada.";
    const observacionesLines = doc.splitTextToSize(observacionesText, 170);
    
    // Check if observations fit on current page
    if (yPos + observacionesLines.length * 4 > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.text(observacionesLines, 20, yPos);
  }

  static _addComprehensiveFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    
    // Add footer only to the last page
    doc.setPage(pageCount);
    
    // Legal advice text centered at the bottom
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    
    const legalText = "Este informe constituye una evaluación preliminar básica y no reemplaza el asesoramiento legal especializado. Para implementación completa del sistema de cumplimiento, se recomienda consultar con expertos en protección de datos.";
    const legalLines = doc.splitTextToSize(legalText, 170);
    
    // Position at the very bottom of the page, centered
    const bottomY = 285; // Very bottom of the page
    const startY = bottomY - (legalLines.length * 3); // Calculate starting position
    
    legalLines.forEach((line, index) => {
      doc.text(line, 105, startY + (index * 3), { align: "center" });
    });
    
    // Add page numbers to all pages except the first
    for (let i = 2; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
    }
  }

  static _getSimpleRecommendations(nivelRiesgo) {
    switch(nivelRiesgo) {
      case 'ALTO CUMPLIMIENTO/BAJO RIESGO':
        return [
          'Mantener las buenas prácticas implementadas',
          'Realizar revisiones periódicas del sistema de protección de datos',
          'Continuar con la capacitación del personal'
        ];
      case 'CUMPLIMIENTO MEDIO/RIESGO MEDIO':
        return [
          'Fortalecer las medidas de seguridad existentes',
          'Implementar procedimientos de gestión de consentimientos',
          'Establecer un programa de capacitación en protección de datos'
        ];
      case 'BAJO CUMPLIMIENTO/ALTO RIESGO':
        return [
          'Implementar urgentemente políticas de protección de datos',
          'Establecer medidas de seguridad técnicas y organizativas',
          'Designar un responsable de protección de datos'
        ];
      case 'NULO CUMPLIMIENTO/ALTÍSIMO RIESGO':
        return [
          'Suspender el tratamiento de datos hasta implementar medidas básicas',
          'Contratar asesoría especializada en protección de datos',
          'Implementar un plan de cumplimiento integral inmediato'
        ];
      default:
        return ['Revisar el cumplimiento normativo en protección de datos'];
    }
  }

  static _addHeadersAndPageNumbers(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Add website link to top left corner for pages 2 and 3, moved away from edge
      if (i >= 2) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(128, 128, 128);
        doc.text("https://agencia43.com/", 25, 15); // Moved from (20, 10) to (25, 15)
      }
      
      // Footer with simplified content
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);
      
      // Page number in center
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
      
      // Date in bottom right corner
      doc.text(new Date().toLocaleDateString('es-ES'), 190, 290, { align: "right" });
    }
    
    // Add legal disclaimer to the last page
    doc.setPage(pageCount);
    
    // Copyright notice
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    doc.text("© 2025 Agencia43 S.A.S. Todos los derechos reservados.", 105, 270, { align: "center" });
    
    // Legal disclaimer text
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    
    const legalText = "Este material es propiedad intelectual protegida. Queda estrictamente prohibida su reproducción total o parcial, su venta, distribución, uso comercial o aprovechamiento para servicios de consultoría sin la autorización expresa de Agencia43 S.A.S. Para solicitar permisos de uso, contactar a: contacto@agencia43.com";
    const legalLines = doc.splitTextToSize(legalText, 170);
    
    // Position above the page number and date
    const startY = 275;
    legalLines.forEach((line, index) => {
      doc.text(line, 105, startY + (index * 3), { align: "center" });
    });
  }

  static _getAccionesPrioritarias(nivelRiesgo) {
    const headers = ["Área", "Acción recomendada", "Plazo máximo sugerido"];
    
    switch (nivelRiesgo) {
      case "Alto Cumplimiento/Bajo Riesgo":
        return [
          headers,
          ["Capacitación", "Elaborar un programa de capacitación", "Trimestral"],
          ["Revisión", "Actualizar documentación", "Semestral"],
          ["Auditoría", "Realizar evaluaciones", "Anual"],
          ["Mejora", "Optimizar y automatizar procesos", "Continuo"]
        ];
      
      case "Cumplimiento Medio/Riesgo Medio":
        return [
          headers,
          ["Documentación", "Completar registros faltantes y actualizar la documentación", "1-2 meses"],
          ["Procesos", "Formalizar procedimientos y validar su funcionamiento", "2-3 meses"],
          ["Seguridad", "Fortalecer controles existentes", "3 meses"],
          ["Monitoreo", "Implementar indicadores", "3 meses"]
        ];
      
      case "Bajo Cumplimiento/Alto Riesgo":
        return [
          headers,
          ["Gobierno", "Designar DPO/Oficial de Protección y estructura para cumplimiento", "Inmediato"],
          ["Legal", "Desarrollar política de protección", "1-2 meses"],
          ["Operativo", "Implementar controles básicos", "2-3 meses"],
          ["Capacitación", "Formar al personal clave", "1 mes"]
        ];
      
      case "Nulo Cumplimiento/Altísimo Riesgo":
        return [
          headers,
          ["Gobierno", "Designar DPO y un equipo de trabajo", "Inmediato"],
          ["Legal", "Implementar medidas básicas de cumplimiento del marco normativo", "3 semanas"],
          ["Operativo", "Implementar controles básicos", "3 semanas"],
          ["Capacitación", "Capacitación al personal", "1 mes"]
        ];
      
      default:
        return [headers, ["N/A", "No determinado", "N/A"]];
    }
  }

  static _getRecomendacionesInmediatas(nivelRiesgo) {
    switch (nivelRiesgo) {
      case "Alto Cumplimiento/Bajo Riesgo":
        return [
          "a) Mantener actualizada la documentación de los registros de los procesos",
          "b) Implementar mejoras tecnológicas para automatización de registros y eliminación de información",
          "c) Desarrollar métricas avanzadas de cumplimiento",
          "d) Establecer programa de mejora continua",
          "e) Fortalecer la cultura de protección de datos"
        ];
      
      case "Cumplimiento Medio/Riesgo Medio":
        return [
          "a) Realizar una revisión detallada de los procesos actuales",
          "b) Actualizar políticas y procedimientos existentes",
          "c) Fortalecer los controles de seguridad implementados",
          "d) Mejorar los mecanismos de obtención y gestión de consentimientos",
          "e) Establecer indicadores de cumplimiento y seguimiento"
        ];
      
      case "Bajo Cumplimiento/Alto Riesgo":
        return [
          "a) Designación inmediata de responsables",
          "b) Realizar una auditoría urgente de la gestión y protección de los datos personales.",
          "c) Establecer un programa de cumplimiento normativo y el respectivo presupuesto.",
          "d) Implementar controles de seguridad básicos, tanto a nivel lógico como físico.",
          "e) Desarrollar procedimientos para la obtención, registro y almacenamiento del consentimiento del titular",
          "f) Elaborar un plan de respuesta a incidentes"
        ];
      
      case "Nulo Cumplimiento/Altísimo Riesgo":
        return [
          "a) Suspender temporalmente todo tratamiento no esencial de datos personales",
          "b) Realizar auditoría de protección de datos personales",
          "c) Implementar controles de seguridad críticos inmediatos",
          "d) Establecer protocolos de emergencia para protección de datos",
          "e) Notificar a la dirección sobre riesgos legales personales",
          "f) Asegurar presupuesto para cumplimiento"
        ];
      
      default:
        return ["Recomendaciones no determinadas."];
    }
  }

  static _drawTable(doc, x, y, data) {
    const headers = ["Acción", "Descripción", "Plazo máximo sugerido"];
    const colWidths = [50, 85, 35]; // Keep existing column widths
    const rowHeight = 5; // Match the compact row height from results table
    const headerHeight = 6; // Match header height from results table
    
    // Draw headers - match results table styling exactly
    doc.setFillColor(220, 220, 220);
    doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), headerHeight, 'F');
    doc.setFontSize(8); // Match results table font size
    doc.setFont("helvetica", "bold");
    
    let currentX = x;
    headers.forEach((header, index) => {
      if (index === 0) {
        // Left align first column like "Sección"
        doc.text(header, currentX + 5, y + 4);
      } else if (index === 2) {
        // Right align last column like "Porcentaje"
        doc.text(header, currentX + colWidths[index] - 5, y + 4, { align: "right" });
      } else {
        // Center align middle column
        const textX = currentX + (colWidths[index] / 2);
        doc.text(header, textX, y + 4, { align: "center" });
      }
      currentX += colWidths[index];
    });
    
    y += headerHeight;
    
    // Draw data rows - match results table styling exactly
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8); // Match results table font size
    
    data.forEach((row, rowIndex) => {
      // Alternate row colors - match results table
      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
      }
      
      currentX = x;
      row.forEach((cell, colIndex) => {
        // Handle text positioning like results table
        if (colIndex === 0) {
          // Left align first column with margin
          const maxWidth = colWidths[colIndex] - 10;
          const lines = doc.splitTextToSize(cell, maxWidth);
          doc.text(lines, currentX + 5, y + 3.5);
        } else if (colIndex === 2) {
          // Right align last column like percentages
          doc.text(cell, currentX + colWidths[colIndex] - 5, y + 3.5, { align: "right" });
        } else {
          // Handle description column with text wrapping
          const maxWidth = colWidths[colIndex] - 10;
          const lines = doc.splitTextToSize(cell, maxWidth);
          doc.text(lines, currentX + 5, y + 3.5);
        }
        
        currentX += colWidths[colIndex];
      });
      
      y += rowHeight;
    });
    
    // No borders - clean look like results table
    return y;
  }

  static _determineRiskLevel(porcentaje) {
    // Updated to match exact ranges from user's specification
    if (porcentaje >= 90) return "Alto Cumplimiento/Bajo Riesgo";
    if (porcentaje >= 55) return "Cumplimiento Medio/Riesgo Medio";
    if (porcentaje >= 30) return "Bajo Cumplimiento/Alto Riesgo";
    return "Nulo Cumplimiento/Altísimo Riesgo";
  }

  static _getRiskColor(nivelRiesgo) {
    switch (nivelRiesgo) {
      case "Alto Cumplimiento/Bajo Riesgo":
        return { r: 34, g: 197, b: 94 }; // Green
      case "Cumplimiento Medio/Riesgo Medio":
        return { r: 245, g: 158, b: 11 }; // Yellow
      case "Bajo Cumplimiento/Alto Riesgo":
        return { r: 249, g: 115, b: 22 }; // Orange
      case "Nulo Cumplimiento/Altísimo Riesgo":
        return { r: 239, g: 68, b: 68 }; // Red
      default:
        return { r: 107, g: 114, b: 128 }; // Gray
    }
  }

  static _getSituacionActual(nivelRiesgo) {
    switch (nivelRiesgo) {
      case "Alto Cumplimiento/Bajo Riesgo":
        return "La organización demuestra un adecuado nivel de cumplimiento en materia de protección de datos personales, con implementación robusta de controles y medidas de seguridad. Se identifican aspectos menores de mejora que permitirían alcanzar la excelencia en el cumplimiento normativo.";
      
      case "Cumplimiento Medio/Riesgo Medio":
        return "La organización cuenta con controles básicos, pero requiere fortalecer sus procesos y documentación para alcanzar un nivel óptimo de cumplimiento. Se registra una implementación parcial de controles y medidas de seguridad que no son suficientes para alcanzar un nivel adecuado.";
      
      case "Bajo Cumplimiento/Alto Riesgo":
        return "La organización presenta vulnerabilidades críticas en la protección de datos personales, con ausencia de controles básicos y alto riesgo de incumplimiento normativo. Se identifican brechas críticas que requieren atención inmediata para mitigar riesgos sustanciales.";
      
      case "Nulo Cumplimiento/Altísimo Riesgo":
        return "La organización presenta un estado crítico de incumplimiento total en materia de protección de datos personales, con ausencia absoluta de controles y medidas básicas de seguridad. No se identifican políticas, procedimientos ni responsables designados para el tratamiento de datos personales.";
      
      default:
        return "Situación no determinada.";
    }
  }

  static _getRepercusionesPrincipales(nivelRiesgo) {
    switch (nivelRiesgo) {
      case "Alto Cumplimiento/Bajo Riesgo":
        return [
          "a) Exposición mínima a sanciones administrativas",
          "b) Posicionamiento favorable ante autoridades regulatorias",
          "c) Base sólida para la confianza de titulares y stakeholders",
          "d) Ventaja competitiva en términos de cumplimiento",
          "e) Oportunidades de optimización de procesos existentes"
        ];
      
      case "Cumplimiento Medio/Riesgo Medio":
        return [
          "a) Exposición moderada a sanciones administrativas",
          "b) Vulnerabilidades específicas en el tratamiento de datos",
          "c) Riesgo de pérdida de confianza de titulares",
          "d) Potencial afectación a la confianza de grupos de interés",
          "e) Necesidad de fortalecer procesos existentes"
        ];
      
      case "Bajo Cumplimiento/Alto Riesgo":
        return [
          "a) Alta exposición a sanciones administrativas y multas",
          "b) Riesgo significativo de filtración de datos",
          "c) Afectación grave a la reputación organizacional",
          "d) Afectación grave a la reputación organizacional",
          "e) Riesgo de pérdidas económicas significativas"
        ];
      
      case "Nulo Cumplimiento/Altísimo Riesgo":
        return [
          "a) Exposición inmediata a sanciones administrativas máximas",
          "b) Riesgo inminente de filtración y pérdida de datos",
          "c) Alta probabilidad de demandas por parte de titulares",
          "d) Daño severo e inmediato a la reputación empresarial",
          "e) Posible suspensión de operaciones por incumplimiento grave",
          "f) Responsabilidad personal de directivos"
        ];
      
      default:
        return ["Repercusiones no determinadas."];
    }
  }
}

class EmailSender {
  static async sendEmailWithPDF(doc) {
    try {
      console.log("Iniciando envío de email con PDF...");
      
      // Get user data with better validation
      const usuario = JSON.parse(localStorage.getItem("usuarioData") || "{}");
      console.log("Datos de usuario encontrados:", usuario);
      
      if (!usuario.email) {
        // Try to get email from other possible sources
        const registroData = JSON.parse(localStorage.getItem("registroData") || "{}");
        if (registroData.email) {
          usuario.email = registroData.email;
          usuario.nombre = registroData.nombre || usuario.nombre;
          usuario.empresa = registroData.empresa || usuario.empresa;
        } else {
          // Prompt user for email if not found
          const email = prompt("Por favor, ingrese su correo electrónico para recibir el informe:");
          if (!email || !email.includes('@')) {
            throw new Error("Correo electrónico requerido para enviar el informe");
          }
          usuario.email = email;
          usuario.nombre = usuario.nombre || "Usuario";
          usuario.empresa = usuario.empresa || "Empresa";
          
          // Save for future use
          localStorage.setItem("usuarioData", JSON.stringify(usuario));
        }
      }

      console.log("Email a enviar:", usuario.email);

      // Convert PDF to base64
      const pdfBase64 = doc.output("datauristring");
      console.log("PDF convertido a base64, tamaño:", pdfBase64.length);

      // Create payload for server
      const payload = {
        email: usuario.email,
        nombre: usuario.nombre || "Usuario",
        empresa: usuario.empresa || "Empresa",
        pdf: pdfBase64
      };

      console.log("Enviando solicitud al servidor...");
      
      // Send to server endpoint
      const response = await fetch("/api/enviar-informe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Respuesta del servidor:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Error del servidor:", errorData);
        throw new Error(`Error del servidor: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log("Email enviado exitosamente:", result);
      
      // Set access flag for thank you page
      localStorage.setItem('thankYouAccess', 'true');
      
      // Redirect to thank you page instead of showing alert
      window.location.href = 'gracias.html';
      
      return result;
      
    } catch (error) {
      console.error("Error enviando email:", error);
      alert(`❌ Error al enviar el email: ${error.message}`);
      throw error;
    }
  }
}

class NavigationHandler {
  constructor() {
    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";
    this.initializeNavigation(currentPage);
  }

  initializeNavigation(currentPage) {
    const config = APP_CONFIG.navigationFlow[currentPage];
    if (config) {
      const button =
        document.getElementById("btnSiguiente") ||
        document.getElementById("btnComenzar") ||
        document.getElementById("btnIniciar");

      if (button) {
        button.addEventListener("click", () => {
          cleanupSectionIndicator();
          window.location.href = config;
        });
        console.log(`Navigation handler added for ${currentPage}`);
      }
    }
  }
}

class FormHandler {
  constructor() {
    this.form = document.querySelector("form");
    if (!this.form) return;

    this.formId = this.form.id;
    this.config = APP_CONFIG.formConfig[this.formId];
    if (!this.config) return;

    this.progressBar = document.getElementById("progressBar");
    this.progressText = document.getElementById("progressText");
    this.submitButton = document.getElementById("btnSiguiente");
    this.totalQuestions = this.config.questions;

    this.initializeForm();
    this.updateProgress();
    this.addSectionIndicator();
    this.addFormAnimations();
  }

  addFormAnimations() {
    // Fade-in animation for all questions
    const questions = this.form.querySelectorAll('.pregunta');
    questions.forEach((question, index) => {
      question.style.opacity = '0';
      question.style.transform = 'translateY(20px)';
      question.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      setTimeout(() => {
        question.style.opacity = '1';
        question.style.transform = 'translateY(0)';
      }, 100 * index);
    });
  }

  addSectionIndicator() {
    const sectionNumber = parseInt(this.formId.replace(/\D/g, ''));
    
    const indicatorContainer = document.createElement('div');
    indicatorContainer.className = 'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 z-10 transform transition-transform duration-300';
    
    const sectionIndicator = document.createElement('div');
    sectionIndicator.className = 'text-center text-gray-600 font-medium text-base';
    sectionIndicator.textContent = `Sección ${sectionNumber} de 7`;
    
    // Add progress dots
    const progressDots = document.createElement('div');
    progressDots.className = 'flex justify-center space-x-2 mt-2';
    
    for (let i = 1; i <= 7; i++) {
      const dot = document.createElement('div');
      dot.className = `w-3 h-3 rounded-full transition-colors duration-300 ${
        i === sectionNumber ? 'bg-blue-500' : 'bg-gray-300'
      }`;
      progressDots.appendChild(dot);
    }
    
    indicatorContainer.appendChild(sectionIndicator);
    indicatorContainer.appendChild(progressDots);
    
    // Add padding to form
    this.form.style.paddingBottom = '5rem';
    
    // Add scroll-based visibility
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll > lastScroll && currentScroll > 100) {
        // Scrolling down, hide indicator
        indicatorContainer.style.transform = 'translateY(100%)';
      } else {
        // Scrolling up or at top, show indicator
        indicatorContainer.style.transform = 'translateY(0)';
      }
      lastScroll = currentScroll;
    });
    
    document.body.appendChild(indicatorContainer);
  }

  updateProgress() {
    const answeredQuestions = this.form.querySelectorAll('input[type="radio"]:checked').length;
    const progressPercentage = Math.round((answeredQuestions / this.totalQuestions) * 100);

    if (this.progressBar) {
      // Animate progress bar
      this.progressBar.style.transition = 'width 0.5s ease-in-out';
      this.progressBar.style.width = `${progressPercentage}%`;
      this.progressBar.setAttribute('aria-valuenow', progressPercentage);
    }

    if (this.progressText) {
      // Animate progress text
      this.progressText.style.transition = 'color 0.3s ease';
      this.progressText.textContent = `${progressPercentage}%`;
      
      // Update color based on progress
      if (progressPercentage >= 80) {
        this.progressText.style.color = '#059669'; // green-600
      } else if (progressPercentage >= 50) {
        this.progressText.style.color = '#D97706'; // yellow-600
      } else {
        this.progressText.style.color = '#DC2626'; // red-600
      }
    }

    if (this.submitButton) {
      const isComplete = answeredQuestions === this.totalQuestions;
      this.submitButton.disabled = !isComplete;
      
      // Add transition classes
      this.submitButton.classList.toggle('opacity-50', !isComplete);
      this.submitButton.classList.toggle('cursor-not-allowed', !isComplete);
      this.submitButton.classList.toggle('transform', true);
      this.submitButton.classList.toggle('transition-all', true);
      this.submitButton.classList.toggle('duration-300', true);
      
      if (isComplete) {
        this.submitButton.classList.add('hover:scale-105');
      } else {
        this.submitButton.classList.remove('hover:scale-105');
      }
    }
  }

  initializeForm() {
    // Add change event listeners to all radio inputs
    const radioInputs = this.form.querySelectorAll('input[type="radio"]');
    radioInputs.forEach((input) => {
      input.addEventListener("change", () => {
        this.updateProgress();
        this.saveResponses();
      });
    });

    // Add submit event listener
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.isFormComplete()) {
        this.saveResponses();
        window.location.href = this.config.nextPage;
      }
    });
  }

  saveResponses() {
    const respuestas = [];
    const preguntas = Array.from(this.form.querySelectorAll('.pregunta'));
    let allAnswered = true;

    // Add specific logging for sections 1, 4, and 5
    const isSpecialSection = ['seccion1Form', 'seccion4Form', 'seccion5Form'].includes(this.formId);
    if (isSpecialSection) {
      console.log(`Procesando respuestas para ${this.formId}`);
    }

    preguntas.forEach((pregunta, idx) => {
      const radios = pregunta.querySelectorAll('input[type="radio"]');
      let seleccionado = null;
      let seleccionadoValue = null;
      
      radios.forEach(radio => {
        if (radio.checked) {
          seleccionado = radio;
          seleccionadoValue = radio.value;
        }
      });

      if (seleccionado) {
        // Ensure value is a number
        const numericValue = Number(seleccionadoValue);
        if (!isNaN(numericValue)) {
          respuestas.push(numericValue);
          if (isSpecialSection) {
            console.log(`Pregunta ${idx + 1}: ${numericValue} puntos`);
          }
      } else {
          console.error(`Valor inválido en ${this.formId}, pregunta ${idx + 1}: ${seleccionadoValue}`);
        allAnswered = false;
        }
      } else {
        allAnswered = false;
        console.warn(`Pregunta no respondida en ${this.formId}: pregunta${idx+1}`);
      }
    });

    if (allAnswered) {
      // Validate array length matches expected questions
      if (respuestas.length === this.config.questions) {
      localStorage.setItem(this.formId, JSON.stringify(respuestas));
      console.log(`Respuestas guardadas para ${this.formId}:`, respuestas);
        
        // Additional validation for special sections
        if (isSpecialSection) {
          const total = respuestas.reduce((sum, val) => sum + val, 0);
          console.log(`Total puntos ${this.formId}: ${total}/${this.config.questions * 3}`);
        }
        cleanupSectionIndicator();
      } else {
        if (isSpecialSection) {
          // alert removed as requested
        }
        console.error(`Error: número incorrecto de respuestas en ${this.formId}. Esperado: ${this.config.questions}, Recibido: ${respuestas.length}`);
    }
    } else {
      if (isSpecialSection) {
        // alert removed as requested
      }
      console.warn(`No se guardaron respuestas para ${this.formId} porque faltan preguntas.`);
    }
  }

  isFormComplete() {
    const answeredQuestions = this.form.querySelectorAll(
      'input[type="radio"]:checked'
    ).length;
    return answeredQuestions === this.totalQuestions;
  }
}

// Add this function to handle cleanup when navigating away
function cleanupSectionIndicator() {
  const indicator = document.querySelector('.fixed.bottom-0');
  if (indicator) {
    indicator.remove();
  }
}

// Añadir esta función para detectar la página actual de forma más robusta
function detectarPaginaActual() {
  const ruta = window.location.pathname;
  const nombreArchivo = ruta.substring(ruta.lastIndexOf('/') + 1);
  return nombreArchivo || 'index.html';
}

// Enhanced error handling wrapper for initialization
async function safeInitializeResultsPage() {
  console.log("=== INICIALIZACIÓN SEGURA DE PÁGINA DE RESULTADOS ===");
  console.log("DOM readyState:", document.readyState);
  console.log("Timestamp:", new Date().toISOString());
  
  try {
    // Check if we have valid data first
    const hasValidData = verificarSeccionesCompletas();
    console.log("¿Tiene datos válidos?", hasValidData);
    
    if (!hasValidData) {
      console.log("No hay datos válidos, creando datos demo...");
      crearDatosDemo();
      
      // Verify demo data was created
      const demoDataCheck = verificarSeccionesCompletas();
      if (!demoDataCheck) {
        console.error("Error: No se pudieron crear datos demo válidos");
        showNoDataMessage();
        return;
      }
      console.log("✅ Datos demo creados exitosamente");
    }
    
    // Wait for DOM to be ready
    console.log("Esperando DOM y canvas...");
    await waitForDOMAndCanvas();
    console.log("✅ DOM y canvas listos");
    
    // Initialize the results page
    console.log("Iniciando inicialización de página de resultados...");
    await initializeResultsPage();
    
    console.log("✅ Página de resultados inicializada exitosamente");
    
    // Final verification after everything is done
    setTimeout(() => {
      console.log("=== VERIFICACIÓN FINAL ===");
      const porcentajeNumero = document.getElementById('porcentajeNumero');
      if (porcentajeNumero && porcentajeNumero.textContent === '--%') {
        console.warn("El porcentaje no se actualizó en el primer intento; reintentando actualización.");
        try {
          const resultados = obtenerResultados();
          if (resultados && resultados.porcentajeGlobal !== undefined) {
            const porcentaje = Math.round(resultados.porcentajeGlobal);
            actualizarNivelRiesgo(porcentaje, resultados.nivelRiesgo, resultados.totalPuntos);
            console.log('✅ Reintento de actualización exitoso');
          }
        } catch (e) {
          console.error("Error reintentando actualización:", e);
        }
      }
    }, 1000);
      
    } catch (error) {
    console.error("❌ Error en inicialización segura:", error);
    showInitializationError(error);
  }
}

// New function to wait for DOM and canvas
async function waitForDOMAndCanvas() {
  return new Promise((resolve, reject) => {
    const maxWaitTime = 10000; // 10 seconds max
    const startTime = Date.now();
    
    function checkDOMAndCanvas() {
      // Check if DOM is ready
      if (document.readyState !== 'complete') {
        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('Timeout esperando que el DOM esté listo'));
      return;
        }
        setTimeout(checkDOMAndCanvas, 100);
        return;
      }
      
      // Check if canvas exists
      const canvas = document.getElementById("graficoResultados");
      if (!canvas) {
        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('Timeout esperando el elemento canvas'));
          return;
        }
        setTimeout(checkDOMAndCanvas, 100);
        return;
      }
      
      console.log('DOM y canvas listos para inicialización');
      resolve();
    }
    
    checkDOMAndCanvas();
  });
}

// Enhanced error display function
function showInitializationError(error) {
        const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        errorDiv.innerHTML = `
    <div class="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl">
      <div class="flex items-center mb-4">
            <div class="flex-shrink-0">
          <svg class="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
          <h3 class="text-lg font-medium text-red-800">Error de inicialización</h3>
        </div>
      </div>
      <div class="mb-4">
        <p class="text-sm text-red-700">
          No se pudo cargar la página de resultados completamente. Esto puede deberse a:
        </p>
        <ul class="mt-2 text-sm text-red-600 list-disc list-inside">
          <li>Problemas de conexión a internet</li>
          <li>Datos de evaluación incompletos</li>
          <li>Error en la carga de dependencias</li>
        </ul>
      </div>
      <div class="flex space-x-3">
        <button onclick="window.location.reload()" class="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
          Recargar página
        </button>
        <button onclick="window.location.href='seccion_uno.html'" class="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors">
          Volver al inicio
        </button>
            </div>
          </div>
        `;
  document.body.appendChild(errorDiv);
}

// Modificar el código de inicialización de página de resultados
document.addEventListener("DOMContentLoaded", () => {
  const paginaActual = detectarPaginaActual();
  console.log("DOM loaded, página actual:", paginaActual);
  
  // Inicializar manejadores generales
  new FormHandler();
  new NavigationHandler();
  
  // Inicializar específicamente para la página de resultados
  if (paginaActual === "resultados.html") {
    console.log("Inicializando página de resultados...");
    
    // Add a small delay to ensure all scripts are loaded
    setTimeout(() => {
    safeInitializeResultsPage().catch(error => {
      console.error("Error crítico en inicialización:", error);
        // Show fallback error message if initialization completely fails
        const body = document.body;
        if (body && !document.querySelector('.initialization-error')) {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'initialization-error bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4';
          errorDiv.innerHTML = `
            <strong>Error de inicialización:</strong> No se pudo cargar la página de resultados.
            <br><small>Error: ${error.message}</small>
            <br><button onclick="window.location.reload()" class="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm">Recargar</button>
          `;
          body.insertBefore(errorDiv, body.firstChild);
        }
      });
    }, 100);
  }
});

// Also add a fallback for when DOMContentLoaded has already fired
if (document.readyState === 'loading') {
  // DOMContentLoaded has not fired yet
  console.log("DOM still loading, waiting for DOMContentLoaded event");
} else {
  // DOMContentLoaded has already fired
  console.log("DOM already loaded, initializing immediately");
  const paginaActual = detectarPaginaActual();
  
  if (paginaActual === "resultados.html") {
    console.log("Inicialización inmediata para página de resultados");
    setTimeout(() => {
      safeInitializeResultsPage().catch(error => {
        console.error("Error en inicialización inmediata:", error);
      });
    }, 100);
  }
}

// Update constants for scoring
const APP_CONSTANTS = {
  PUNTOS_MAXIMOS: 105, // 35 questions * 3 points each
  SECCIONES: [
    "seccion1Form", "seccion2Form", "seccion3Form", "seccion4Form", 
    "seccion5Form", "seccion6Form", "seccion7Form"
  ],
  NIVELES_RIESGO: {
    ALTO: { min: 90, max: 100, label: "Alto Cumplimiento/Bajo Riesgo" },
    MEDIO: { min: 55, max: 89, label: "Cumplimiento Medio/Riesgo Medio" },
    BAJO: { min: 30, max: 54, label: "Bajo Cumplimiento/Alto Riesgo" },
    NULO: { min: 0, max: 29, label: "Nulo Cumplimiento/Altísimo Riesgo" }
  }
};

// Function to create demo data for testing
function crearDatosDemo() {
  console.log("Creando datos de demostración para testing...");
  
  // Create demo user data
  const usuarioDemo = {
    nombre: "Usuario",
    apellido: "Demo",
    email: "demo@ejemplo.com",
    empresa: "Empresa Demo S.A.S."
  };
  localStorage.setItem("usuarioData", JSON.stringify(usuarioDemo));
  
  // Create demo section data with specific scores to match the chart percentages
  // Each section has 5 questions, each worth 0-3 points (max 15 points per section)
  const demoSectionData = [
    [1, 1, 1, 1, 1], // Section 1: 5/15 = 33%
    [1, 1, 0, 1, 1], // Section 2: 4/15 = 27%  
    [3, 2, 3, 2, 2], // Section 3: 12/15 = 80%
    [2, 1, 1, 2, 1], // Section 4: 7/15 = 47%
    [2, 1, 2, 2, 0], // Section 5: 7/15 = 47%
    [2, 2, 2, 2, 0], // Section 6: 8/15 = 53%
    [1, 1, 1, 1, 1]  // Section 7: 5/15 = 33%
  ];
  
  APP_CONSTANTS.SECCIONES.forEach((seccion, index) => {
    const respuestasDemo = demoSectionData[index];
    localStorage.setItem(seccion, JSON.stringify(respuestasDemo));
    const puntos = respuestasDemo.reduce((a, b) => a + b, 0);
    const porcentaje = Math.round((puntos / 15) * 100);
    console.log(`Datos demo creados para ${seccion}: ${JSON.stringify(respuestasDemo)} = ${puntos}/15 puntos (${porcentaje}%)`);
  });
  
  console.log("Datos de demostración creados exitosamente");
  return true;
}

// Make function globally accessible
window.crearDatosDemo = crearDatosDemo;

// Add global function for manual testing
window.testResultsPage = function() {
  console.log("=== TESTING RESULTS PAGE ===");
  crearDatosDemo();
  console.log("Demo data created, reloading page...");
  window.location.reload();
};

// Add global function to clear all data
window.clearAllData = function() {
  console.log("=== CLEARING ALL DATA ===");
  localStorage.clear();
  console.log("All data cleared, redirecting to start...");
  window.location.href = 'index.html';
};

function determinarNivelRiesgo(porcentaje) {
  // Updated to match exact ranges from user's specification
  if (porcentaje >= 90) return "Alto Cumplimiento/Bajo Riesgo";
  if (porcentaje >= 55) return "Cumplimiento Medio/Riesgo Medio";
  if (porcentaje >= 30) return "Bajo Cumplimiento/Alto Riesgo";
  return "Nulo Cumplimiento/Altísimo Riesgo";
}

function calcularResultados() {
  // Check data integrity first
  const dataIssues = DataValidator.checkDataIntegrity();
  if (dataIssues.length > 0) {
    console.warn("Problemas de integridad de datos detectados:", dataIssues);
  }
  
  // Verificar completitud
  const seccionesCompletas = verificarSeccionesCompletas();
  if (!seccionesCompletas) {
    console.warn("Secciones incompletas detectadas. Opciones:");
    console.log("1. Redirigir a formulario incompleto");
    console.log("2. Crear datos de demostración para testing");
    
    // For development/testing, create demo data instead of redirecting
    const useDemoData = confirm("No se encontraron datos completos. ¿Desea usar datos de demostración para testing?");
    if (useDemoData) {
      crearDatosDemo();
    } else {
    redirigirAFormularioIncompleto();
    return null;
    }
  }
  
  // Calcular puntuaciones con validación
  const { puntuacionesPorSeccion, porcentajesPorSeccion, totalPuntos } = procesarSecciones();
  const porcentajeTotal = Math.round((totalPuntos / APP_CONSTANTS.PUNTOS_MAXIMOS) * 100);
  
  // Validar resultados calculados
  if (totalPuntos < 0 || totalPuntos > APP_CONSTANTS.PUNTOS_MAXIMOS) {
    console.error("Puntuación total fuera de rango:", totalPuntos);
  }
  
  if (porcentajesPorSeccion.some(p => p < 0 || p > 100)) {
    console.error("Porcentajes por sección fuera de rango:", porcentajesPorSeccion);
  }
  
  // Crear y guardar resultados
  const resultados = {
    puntuacionesPorSeccion,
    porcentajesPorSeccion,
    totalPuntos,
    porcentajeTotal,
    nivelRiesgo: determinarNivelRiesgo(porcentajeTotal),
    fechaEvaluacion: new Date().toISOString(),
    dataIntegrityIssues: dataIssues.length > 0 ? dataIssues : null,
    isDemoData: localStorage.getItem("usuarioData")?.includes("demo@ejemplo.com") || false
  };
  
  localStorage.setItem("resultadosCalculados", JSON.stringify(resultados));
  console.log("Resultados calculados y validados:", resultados);
  return resultados;
}

function verificarSeccionesCompletas() {
  // Comprobar si todas las secciones tienen respuestas
  let todasCompletas = true;
  let seccionesIncompletas = [];
  let detallesValidacion = [];
  
  APP_CONSTANTS.SECCIONES.forEach((seccion) => {
    try {
      const respuestas = JSON.parse(localStorage.getItem(seccion) || "[]");
      const preguntasEsperadas = APP_CONFIG.formConfig[seccion]?.questions || 5;
      
      const detalle = {
        seccion,
        respuestasEncontradas: respuestas.length,
        preguntasEsperadas,
        esValida: respuestas.length === preguntasEsperadas && Array.isArray(respuestas),
        datos: respuestas
      };
      
      detallesValidacion.push(detalle);
      
      if (respuestas.length !== preguntasEsperadas || !Array.isArray(respuestas)) {
        todasCompletas = false;
        seccionesIncompletas.push(seccion);
        console.warn(`Sección incompleta: ${seccion}`, detalle);
      } else {
        console.log(`Sección completa: ${seccion}`, detalle);
      }
    } catch (error) {
      console.error(`Error verificando sección ${seccion}:`, error);
      todasCompletas = false;
      seccionesIncompletas.push(seccion);
      detallesValidacion.push({
        seccion,
        error: error.message,
        esValida: false
      });
    }
  });
  
  console.log("Resumen de validación de secciones:", {
    todasCompletas,
    seccionesIncompletas,
    detallesValidacion
  });
  
  if (!todasCompletas) {
    console.warn("Secciones incompletas detectadas:", seccionesIncompletas);
    localStorage.setItem("seccionesIncompletas", JSON.stringify(seccionesIncompletas));
    localStorage.setItem("detallesValidacion", JSON.stringify(detallesValidacion));
  }
  
  return todasCompletas;
}

function redirigirAFormularioIncompleto() {
  const seccionesIncompletas = JSON.parse(localStorage.getItem("seccionesIncompletas") || "[]");
  let paginaRedireccion = "seccion_uno.html"; // Por defecto, la primera sección
  
  if (seccionesIncompletas.length > 0) {
    // Obtener la primera sección incompleta
    const primeraIncompleta = seccionesIncompletas[0];
    // Convertir el ID del formulario a nombre de página
    paginaRedireccion = APP_CONFIG.formConfig[primeraIncompleta].nextPage;
    
    // Si es la última sección, dirigir a su propia página
    if (primeraIncompleta === "seccion7Form") {
      paginaRedireccion = "seccion_siete.html";
    } else {
      // Obtener la página anterior a la sección incompleta
      const indice = APP_CONSTANTS.SECCIONES.indexOf(primeraIncompleta);
      if (indice > 0) {
        const seccionAnterior = APP_CONSTANTS.SECCIONES[indice - 1];
        paginaRedireccion = APP_CONFIG.formConfig[seccionAnterior].nextPage;
      }
    }
  }
  
  alert("Necesita completar todas las secciones antes de ver los resultados.");
  window.location.href = paginaRedireccion;
}

function procesarSecciones() {
  let puntuacionesPorSeccion = [];
  let porcentajesPorSeccion = [];
  let totalPuntos = 0;
  
  console.log("=== PROCESANDO SECCIONES ===");
  
  APP_CONSTANTS.SECCIONES.forEach((seccion, index) => {
    try {
      const rawData = localStorage.getItem(seccion);
      console.log(`Procesando ${seccion}:`, rawData);
      
      if (!rawData) {
        console.warn(`No hay datos para ${seccion}, usando valores por defecto`);
        puntuacionesPorSeccion.push(0);
        porcentajesPorSeccion.push(0);
        return;
      }
      
      const respuestas = JSON.parse(rawData);
      console.log(`Respuestas parseadas para ${seccion}:`, respuestas);
      
      if (!respuestas || !Array.isArray(respuestas)) {
        console.error(`Respuestas inválidas para sección ${seccion}:`, respuestas);
        puntuacionesPorSeccion.push(0);
        porcentajesPorSeccion.push(0);
        return;
      }
      
      const preguntasSeccion = APP_CONFIG.formConfig[seccion]?.questions || 5;
      const maximoPuntosPorSeccion = preguntasSeccion * 3;
      
      // Validate array length
      if (respuestas.length !== preguntasSeccion) {
        console.error(`Error en ${seccion}: número incorrecto de respuestas. Esperado: ${preguntasSeccion}, Recibido: ${respuestas.length}`);
        // Use available data or fill with zeros
        const respuestasAjustadas = [...respuestas];
        while (respuestasAjustadas.length < preguntasSeccion) {
          respuestasAjustadas.push(0);
        }
        respuestasAjustadas.length = preguntasSeccion; // Trim if too long
        
        const puntuacionSeccion = calcularPuntuacionSeccion(respuestasAjustadas);
        const porcentajeSeccion = Math.round((puntuacionSeccion / maximoPuntosPorSeccion) * 100);
        
        console.warn(`${seccion} - Datos ajustados - Puntuación: ${puntuacionSeccion}/${maximoPuntosPorSeccion} (${porcentajeSeccion}%)`);
        
        puntuacionesPorSeccion.push(puntuacionSeccion);
        porcentajesPorSeccion.push(porcentajeSeccion);
        totalPuntos += puntuacionSeccion;
        return;
      }
      
      const puntuacionSeccion = calcularPuntuacionSeccion(respuestas);
      const porcentajeSeccion = Math.round((puntuacionSeccion / maximoPuntosPorSeccion) * 100);
      
      console.log(`${seccion} - Puntuación: ${puntuacionSeccion}/${maximoPuntosPorSeccion} (${porcentajeSeccion}%)`);
      
      puntuacionesPorSeccion.push(puntuacionSeccion);
      porcentajesPorSeccion.push(porcentajeSeccion);
      totalPuntos += puntuacionSeccion;
    } catch (error) {
      console.error(`Error procesando sección ${seccion}:`, error);
      // Add default values for failed sections
      puntuacionesPorSeccion.push(0);
      porcentajesPorSeccion.push(0);
    }
  });
  
  // Ensure we always have 7 sections
  while (puntuacionesPorSeccion.length < 7) {
    console.warn(`Agregando sección faltante con valores por defecto`);
    puntuacionesPorSeccion.push(0);
    porcentajesPorSeccion.push(0);
  }
  
  console.log('=== RESULTADOS FINALES ===', {
    puntuacionesPorSeccion,
    porcentajesPorSeccion,
    totalPuntos,
    seccionesCompletas: puntuacionesPorSeccion.filter(p => p > 0).length
  });
  
  return { puntuacionesPorSeccion, porcentajesPorSeccion, totalPuntos };
}

function calcularPuntuacionSeccion(respuestas) {
  // Only sum if respuestas is an array of numbers
  if (!Array.isArray(respuestas)) return 0;
  return respuestas.reduce((sum, val) => sum + Number(val), 0);
}

// Función mejorada para inicializar gráfico
async function inicializarGrafico() {
  console.log("=== INICIANDO INICIALIZACIÓN DE GRÁFICO ===");
  
  try {
    // Validate Chart.js is loaded
    if (typeof Chart === 'undefined') {
      throw new Error('Chart.js no está cargado');
    }
    
    // Get chart context with validation
    const ctx = obtenerContextoGrafico();
    if (!ctx) {
      throw new Error('No se pudo obtener el contexto del canvas');
    }
    
    // Get results data with validation
    const resultados = obtenerResultados();
    if (!resultados) {
      console.warn('No hay resultados disponibles, usando datos demo');
      crearDatosDemo();
      const nuevosResultados = obtenerResultados();
      if (!nuevosResultados) {
        throw new Error('No se pudieron crear datos demo válidos');
      }
      return await inicializarGrafico(); // Retry with demo data
    }
    
    console.log('Datos de resultados obtenidos:', {
      porcentajesPorSeccion: resultados.porcentajesPorSeccion,
      porcentajeGlobal: resultados.porcentajeGlobal,
      nivelRiesgo: resultados.nivelRiesgo
    });
    
    // Validate percentage data
    if (!resultados.porcentajesPorSeccion || !Array.isArray(resultados.porcentajesPorSeccion)) {
      throw new Error('Datos de porcentajes por sección inválidos');
    }
    
    if (resultados.porcentajesPorSeccion.length !== 7) {
      console.warn(`Número incorrecto de secciones: ${resultados.porcentajesPorSeccion.length}, esperado: 7`);
      // Pad or trim to 7 sections
      while (resultados.porcentajesPorSeccion.length < 7) {
        resultados.porcentajesPorSeccion.push(0);
      }
      resultados.porcentajesPorSeccion = resultados.porcentajesPorSeccion.slice(0, 7);
    }
    
    // Clean up any existing chart
    limpiarGraficoExistente();
    
    // Check if ChartDataLabels plugin is available
    const hasDataLabels = typeof ChartDataLabels !== 'undefined';
    console.log('Plugin ChartDataLabels disponible:', hasDataLabels);
    
    // Create new chart with enhanced error handling
    try {
    crearNuevoGrafico(ctx, resultados, hasDataLabels);
      console.log('✅ Gráfico creado exitosamente');
    } catch (chartError) {
      console.error('Error creando gráfico:', chartError);
      throw new Error(`Error en creación de gráfico: ${chartError.message}`);
    }
    
    // Update risk level display
    try {
      console.log('Datos para actualizarNivelRiesgo:', {
        porcentajeGlobal: resultados.porcentajeGlobal,
        nivelRiesgo: resultados.nivelRiesgo,
        totalPuntos: resultados.totalPuntos
      });
      
      // Ensure we have a valid percentage
      const porcentajeParaMostrar = Math.round(resultados.porcentajeGlobal || 0);
      
      actualizarNivelRiesgo(
        porcentajeParaMostrar,
        resultados.nivelRiesgo,
        resultados.totalPuntos
      );
      console.log(`✅ Nivel de riesgo actualizado con ${porcentajeParaMostrar}%`);
    } catch (riskError) {
      console.warn('Error actualizando nivel de riesgo:', riskError);
      // Non-critical error, continue
    }
    
    // Display section results
    try {
      displaySectionResults(resultados);
      console.log('✅ Resultados por sección mostrados');
    } catch (sectionError) {
      console.warn('Error mostrando resultados por sección:', sectionError);
      // Non-critical error, continue
    }
    
    console.log("✅ Inicialización de gráfico completada exitosamente");
    
  } catch (error) {
    console.error("❌ Error en inicialización de gráfico:", error);
    
    // Show user-friendly error message
    const canvas = document.getElementById('graficoResultados');
    const chartContainer = canvas ? canvas.parentElement : document.querySelector('.h-80');
    
    if (chartContainer) {
      chartContainer.innerHTML = `
        <div class="error-message" style="
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border: 2px solid #f87171;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        ">
          <div style="color: #dc2626; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
            ⚠️ Error al cargar el gráfico
          </div>
          <div style="color: #7f1d1d; margin-bottom: 15px;">
            ${error.message}
          </div>
          <button onclick="location.reload()" style="
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            🔄 Recargar página
          </button>
        </div>
      `;
    }
    
    throw error;
  }
}

function obtenerContextoGrafico() {
  if (typeof Chart === "undefined") {
    throw new Error("Chart.js no está cargado");
  }
  
  const canvas = document.getElementById("graficoResultados");
  if (!canvas) {
    console.error("Canvas element not found. DOM elements:", {
      body: !!document.body,
      readyState: document.readyState,
      allCanvases: document.querySelectorAll('canvas').length
    });
    throw new Error("Canvas no encontrado - elemento #graficoResultados no existe en el DOM");
  }
  
  if (!(canvas instanceof HTMLCanvasElement)) {
    console.error("Element found but not a canvas:", canvas);
    throw new Error("El elemento encontrado no es un canvas válido");
  }
  
  console.log("Canvas encontrado correctamente:", {
    id: canvas.id,
    width: canvas.width,
    height: canvas.height,
    parentElement: !!canvas.parentElement
  });
  
  return canvas;
}

function obtenerResultados() {
  try {
    const resultados = calcularResultados();
    console.log('Resultados calculados:', resultados);
    
    if (!resultados) {
      console.error('calcularResultados() devolvió null o undefined');
      return null;
    }
    
    // Validate required properties
    if (!resultados.porcentajesPorSeccion || !Array.isArray(resultados.porcentajesPorSeccion)) {
      console.error('porcentajesPorSeccion inválido:', resultados.porcentajesPorSeccion);
      return null;
    }
    
    // Ensure we have the correct property names
    const normalizedResults = {
      porcentajesPorSeccion: resultados.porcentajesPorSeccion,
      porcentajeGlobal: resultados.porcentajeTotal || resultados.porcentajeGlobal || 0,
      nivelRiesgo: resultados.nivelRiesgo || 'DESCONOCIDO',
      totalPuntos: resultados.totalPuntos || 0,
      puntuacionesPorSeccion: resultados.puntuacionesPorSeccion || []
    };
    
    console.log('Resultados normalizados:', normalizedResults);
    return normalizedResults;
    
  } catch (error) {
    console.error('Error en obtenerResultados:', error);
    return null;
  }
}

function limpiarGraficoExistente() {
  if (chartInstance) {
    console.log("Limpiando gráfico existente...");
      chartInstance.destroy();
      chartInstance = null;
  }
}

function crearNuevoGrafico(ctx, resultados, hasDataLabels) {
  // Validate input data thoroughly
  if (!resultados || !resultados.porcentajesPorSeccion) {
    throw new Error("Datos de resultados inválidos para crear el gráfico");
  }
  
  if (!Array.isArray(resultados.porcentajesPorSeccion) || resultados.porcentajesPorSeccion.length !== 7) {
    throw new Error(`Datos de porcentajes inválidos. Esperado: array de 7 elementos, recibido: ${resultados.porcentajesPorSeccion?.length || 'undefined'}`);
  }
  
  // Validate each percentage value
  const validPercentages = resultados.porcentajesPorSeccion.map((p, index) => {
    const num = Number(p);
    if (isNaN(num) || num < 0 || num > 100) {
      console.warn(`Porcentaje inválido en sección ${index + 1}: ${p}, usando 0`);
      return 0;
    }
    return num;
  });
  
  console.log("Datos validados para el gráfico:", validPercentages);

  // Base chart configuration
  const chartConfig = {
    type: "bar",
    data: {
      labels: [
        "1. Gobierno y Cumplimiento",
        "2. Gestión de Consentimientos",
        "3. Medidas de Seguridad",
        "4. Derechos de Titulares",
        "5. Transferencias de Datos",
        "6. Gestión de Proveedores",
        "7. Gestión de Incidentes",
      ],
      datasets: [{
        data: validPercentages,
        backgroundColor: obtenerColoresSegunPorcentaje(validPercentages),
        borderColor: obtenerColoresBordeSegunPorcentaje(validPercentages),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 35,
        maxBarThickness: 40,
        hoverBackgroundColor: obtenerColoresHoverSegunPorcentaje(validPercentages),
        hoverBorderColor: '#333',
        hoverBorderWidth: 3,
      }],
    },
    options: {
      ...configurarOpcionesGrafico(),
      plugins: {
        ...configurarOpcionesGrafico().plugins
      }
    },
  };

  // Add datalabels configuration - always try to add it
  if (hasDataLabels || typeof ChartDataLabels !== 'undefined') {
    // Add the plugin to the plugins array
    chartConfig.plugins = chartConfig.plugins || [];
    if (typeof ChartDataLabels !== 'undefined') {
      chartConfig.plugins.push(ChartDataLabels);
    }
    
    chartConfig.options.plugins.datalabels = {
      anchor: 'end',
      align: 'top',
      offset: 8,
      color: '#333333',
      font: {
        weight: 'bold',
        size: 14,
        family: 'Aptos, Helvetica, Arial, sans-serif'
      },
      clip: false,
      display: true,
      formatter: function(value) {
        return value + '%';
      }
    };
    console.log('Chart configurado con etiquetas de datos mejoradas');
  } else {
    console.log('Chart configurado sin etiquetas de datos - plugin no disponible');
  }

  try {
  chartInstance = new Chart(ctx, chartConfig);
    console.log('Chart instance creado exitosamente');
  } catch (error) {
    console.error('Error creando instancia de Chart:', error);
    throw new Error(`Error al crear el gráfico: ${error.message}`);
  }

  // Force manual label drawing after chart creation with enhanced styling
  setTimeout(() => {
    if (chartInstance && chartInstance.canvas) {
      try {
        drawEnhancedManualLabels(chartInstance);
      } catch (labelError) {
        console.warn('Error dibujando etiquetas manuales:', labelError);
      }
    }
  }, 200);

  console.log('Chart instance creado con UX mejorada:', {
    hasDataLabels: hasDataLabels || typeof ChartDataLabels !== 'undefined',
    pluginsConfigured: Object.keys(chartInstance.options.plugins || {}),
    chartType: chartInstance.config.type,
    pluginsArray: chartConfig.plugins ? chartConfig.plugins.length : 0,
    dataLength: validPercentages.length
  });
}

// Data validation utility
const DataValidator = {
  // Validate section data
  validateSectionData(sectionId, data) {
    if (!Array.isArray(data)) {
      console.error(`Data for ${sectionId} is not an array:`, data);
      return null;
    }
    
    const expectedLength = APP_CONFIG.formConfig[sectionId]?.questions || 5;
    if (data.length !== expectedLength) {
      console.error(`Invalid data length for ${sectionId}. Expected: ${expectedLength}, Got: ${data.length}`);
      return null;
    }
    
    // Validate each response value
    const sanitizedData = data.map((value, index) => {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 3) {
        console.error(`Invalid response value in ${sectionId} question ${index + 1}: ${value}`);
        return 0; // Default to 0 for invalid values
      }
      return numValue;
    });
    
    return sanitizedData;
  },

  // Validate user data
  validateUserData(userData) {
    const required = ['nombre', 'apellido', 'email', 'empresa'];
    const sanitized = {};
    
    required.forEach(field => {
      if (userData[field] && typeof userData[field] === 'string') {
        sanitized[field] = userData[field].trim();
  } else {
        console.warn(`Missing or invalid user data field: ${field}`);
        sanitized[field] = '';
      }
    });
    
    // Basic email validation
    if (sanitized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.email)) {
      console.warn('Invalid email format:', sanitized.email);
    }
    
    return sanitized;
  },

  // Comprehensive data integrity check
  checkDataIntegrity() {
    const issues = [];
    
    // Check user data
    try {
      const userData = JSON.parse(localStorage.getItem("usuarioData") || "{}");
      const validatedUser = this.validateUserData(userData);
      if (!validatedUser.email) {
        issues.push("Email de usuario faltante o inválido");
      }
  } catch (error) {
      issues.push("Datos de usuario corruptos");
    }
    
    // Check section data
    APP_CONSTANTS.SECCIONES.forEach(sectionId => {
      try {
        const rawData = localStorage.getItem(sectionId);
        if (!rawData) {
          issues.push(`Datos faltantes para ${sectionId}`);
          return;
        }
        
        const data = JSON.parse(rawData);
        const validated = this.validateSectionData(sectionId, data);
        if (!validated) {
          issues.push(`Datos inválidos para ${sectionId}`);
        }
      } catch (error) {
        issues.push(`Datos corruptos para ${sectionId}`);
      }
    });
    
    return issues;
  }
};

// Enhanced manual label drawing function
function drawEnhancedManualLabels(chart) {
  if (!chart || !chart.ctx || !chart.data || !chart.data.datasets) {
    console.warn('Chart o datos inválidos para dibujar etiquetas');
    return;
  }
  
  const ctx = chart.ctx;
  
  ctx.save();
  ctx.font = 'bold 14px Aptos, Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  chart.data.datasets.forEach((dataset, datasetIndex) => {
    if (!dataset.data || !Array.isArray(dataset.data)) {
      console.warn(`Dataset ${datasetIndex} no tiene datos válidos`);
      return;
    }
    
    const meta = chart.getDatasetMeta(datasetIndex);
    if (!meta || !meta.data) {
      console.warn(`Meta datos no disponibles para dataset ${datasetIndex}`);
      return;
    }
    
    meta.data.forEach((bar, index) => {
      if (!bar || typeof bar.x === 'undefined' || typeof bar.y === 'undefined') {
        console.warn(`Datos de barra inválidos en índice ${index}`);
        return;
      }
      
      const value = dataset.data[index];
      if (typeof value === 'undefined' || isNaN(value)) {
        console.warn(`Valor inválido en índice ${index}: ${value}`);
    return;
  }
  
      const x = bar.x;
      const y = bar.y - 8; // Position above the bar
      
      // Draw simple text without background
      const text = value + '%';
      
      // Add text shadow for better visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText(text, x + 1, y + 1);
      
      // Draw main text in dark color
      ctx.fillStyle = '#333333';
      ctx.fillText(text, x, y);
    });
  });
  
  ctx.restore();
  console.log('Etiquetas de porcentaje simples dibujadas');
}

function obtenerColoresSegunPorcentaje(porcentajes) {
  return porcentajes.map(porcentaje => {
    if (porcentaje >= 90) return 'rgba(34, 197, 94, 0.8)'; // Verde - Alto Cumplimiento/Bajo Riesgo
    if (porcentaje >= 55) return 'rgba(245, 158, 11, 0.8)'; // Amarillo - Cumplimiento Medio/Riesgo Medio
    if (porcentaje >= 30) return 'rgba(249, 115, 22, 0.8)'; // Naranja - Bajo Cumplimiento/Alto Riesgo
    return 'rgba(239, 68, 68, 0.8)'; // Rojo - Nulo Cumplimiento/Altísimo Riesgo
  });
}

function obtenerColoresBordeSegunPorcentaje(porcentajes) {
  return porcentajes.map(porcentaje => {
    if (porcentaje >= 90) return 'rgba(34, 197, 94, 1)'; // Verde - Alto Cumplimiento/Bajo Riesgo
    if (porcentaje >= 55) return 'rgba(245, 158, 11, 1)'; // Amarillo - Cumplimiento Medio/Riesgo Medio
    if (porcentaje >= 30) return 'rgba(249, 115, 22, 1)'; // Naranja - Bajo Cumplimiento/Alto Riesgo
    return 'rgba(239, 68, 68, 1)'; // Rojo - Nulo Cumplimiento/Altísimo Riesgo
  });
}

function obtenerColoresHoverSegunPorcentaje(porcentajes) {
  return porcentajes.map(porcentaje => {
    if (porcentaje >= 90) return 'rgba(34, 197, 94, 0.9)'; // Verde más intenso
    if (porcentaje >= 55) return 'rgba(245, 158, 11, 0.9)'; // Amarillo más intenso
    if (porcentaje >= 30) return 'rgba(249, 115, 22, 0.9)'; // Naranja más intenso
    return 'rgba(239, 68, 68, 0.9)'; // Rojo más intenso
  });
}

function configurarOpcionesGrafico() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 40,
        bottom: 20,
        left: 20,
        right: 20
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          },
          font: {
            size: 12,
            family: 'Aptos, Helvetica, Arial, sans-serif'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: {
            size: 11,
            family: 'Aptos, Helvetica, Arial, sans-serif'
          }
        },
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#333',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            return `Cumplimiento: ${context.parsed.y}%`;
          }
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };
}

function actualizarNivelRiesgo(porcentaje, nivelRiesgo, puntos) {
  try {
    console.log('=== ACTUALIZANDO NIVEL DE RIESGO ===');
    console.log('Parámetros recibidos:', { porcentaje, nivelRiesgo, puntos });
    
    const nivelRiesgoElement = document.getElementById('nivelRiesgo');
    const porcentajeGlobalElement = document.getElementById('porcentajeGlobal');
    const porcentajeBoxElement = document.getElementById('porcentajeBox');
    const porcentajeNumeroElement = document.getElementById('porcentajeNumero');
    
    console.log('Elementos encontrados:', {
      nivelRiesgoElement: !!nivelRiesgoElement,
      porcentajeGlobalElement: !!porcentajeGlobalElement,
      porcentajeBoxElement: !!porcentajeBoxElement,
      porcentajeNumeroElement: !!porcentajeNumeroElement
    });
    
    // Display user information
    mostrarInformacionUsuario();
    
    if (nivelRiesgoElement) {
      nivelRiesgoElement.textContent = nivelRiesgo;
      console.log(`✅ Nivel de riesgo actualizado: "${nivelRiesgo}"`);
      
      // Add color styling based on risk level
      nivelRiesgoElement.className = 'text-2xl font-bold mb-2';
      if (porcentaje >= 90) {
        nivelRiesgoElement.classList.add('text-green-600');
      } else if (porcentaje >= 55) {
        nivelRiesgoElement.classList.add('text-yellow-600');
      } else if (porcentaje >= 30) {
        nivelRiesgoElement.classList.add('text-orange-600');
      } else {
        nivelRiesgoElement.classList.add('text-red-600');
      }
    }
    
    // Update colored percentage box
    if (porcentajeBoxElement && porcentajeNumeroElement) {
      const porcentajeTexto = `${porcentaje}%`;
      porcentajeNumeroElement.textContent = porcentajeTexto;
      console.log(`✅ Porcentaje número actualizado: "${porcentajeTexto}"`);
      
      // Set background color based on percentage ranges
      porcentajeBoxElement.className = 'w-32 h-32 rounded-lg flex items-center justify-center mb-4 shadow-lg';
  if (porcentaje >= 90) {
        porcentajeBoxElement.classList.add('bg-green-500'); // Alto Cumplimiento/Bajo Riesgo
        console.log('Color aplicado: verde (90%+)');
  } else if (porcentaje >= 55) {
        porcentajeBoxElement.classList.add('bg-yellow-500'); // Cumplimiento Medio/Riesgo Medio
        console.log('Color aplicado: amarillo (55-89%)');
  } else if (porcentaje >= 30) {
        porcentajeBoxElement.classList.add('bg-orange-500'); // Bajo Cumplimiento/Alto Riesgo
        console.log('Color aplicado: naranja (30-54%)');
  } else {
        porcentajeBoxElement.classList.add('bg-red-500'); // Nulo Cumplimiento/Altísimo Riesgo
        console.log('Color aplicado: rojo (0-29%)');
      }
    } else {
      console.error('❌ No se encontraron elementos de porcentaje:', {
        porcentajeBoxElement: !!porcentajeBoxElement,
        porcentajeNumeroElement: !!porcentajeNumeroElement
      });
    }
    
    if (porcentajeGlobalElement) {
      const textoGlobal = `${porcentaje}% de cumplimiento (${puntos} puntos)`;
      porcentajeGlobalElement.textContent = textoGlobal;
      console.log(`✅ Porcentaje global actualizado: "${textoGlobal}"`);
    }
    
    console.log('✅ Nivel de riesgo actualizado completamente:', { porcentaje, nivelRiesgo, puntos });
    } catch (error) {
    console.error('❌ Error actualizando nivel de riesgo:', error);
  }
}

function mostrarInformacionUsuario() {
  try {
    // Get user data from localStorage
    const userData = localStorage.getItem('usuarioData');
    if (!userData) {
      console.warn('No se encontraron datos de usuario');
      return;
    }
    
    const user = JSON.parse(userData);
    
    // Update "Elaborado por" field
    const elaboradoPorElement = document.getElementById('elaboradoPor');
    if (elaboradoPorElement && user.nombre && user.apellido) {
      elaboradoPorElement.textContent = `${user.nombre} ${user.apellido}`;
    }
    
    // Update "Correo electrónico" field
    const correoElement = document.getElementById('correoElectronico');
    if (correoElement && user.email) {
      correoElement.textContent = user.email;
    }
    
    console.log('Información de usuario mostrada:', { 
      nombre: user.nombre, 
      apellido: user.apellido, 
      email: user.email 
    });
    
  } catch (error) {
    console.error('Error mostrando información de usuario:', error);
  }
}

async function initializeResultsPage() {
  console.log("=== INICIALIZANDO PÁGINA DE RESULTADOS ===");
  
  try {
    // Initialize chart (this will also call displaySectionResults internally)
    await inicializarGrafico();
    
    // Configure buttons
    configurarBotones();
    
    // Show user information
    mostrarInformacionUsuario();
    
    console.log("✅ Página de resultados inicializada correctamente");
    
      } catch (error) {
    console.error("❌ Error inicializando página de resultados:", error);
    throw error;
  }
}

function displaySectionResults(resultados) {
  try {
    console.log('=== MOSTRANDO RESULTADOS POR SECCIÓN ===');
    console.log('Datos recibidos:', resultados);
    
    if (!resultados || !resultados.porcentajesPorSeccion) {
      console.warn('No hay resultados para mostrar');
      return;
    }
    
    console.log('Porcentajes por sección:', resultados.porcentajesPorSeccion);
    console.log('Puntuaciones por sección:', resultados.puntuacionesPorSeccion);
    
    // Update section results if elements exist
    resultados.porcentajesPorSeccion.forEach((porcentaje, index) => {
      const sectionElement = document.getElementById(`seccion-${index + 1}`);
      console.log(`Procesando sección ${index + 1}:`, {
        element: !!sectionElement,
        porcentaje: porcentaje,
        puntuacion: resultados.puntuacionesPorSeccion ? resultados.puntuacionesPorSeccion[index] : 'N/A'
      });
      
      if (sectionElement) {
        const puntuacion = resultados.puntuacionesPorSeccion ? resultados.puntuacionesPorSeccion[index] : 0;
        const textoResultado = `Puntuación: ${puntuacion}/15 puntos (${porcentaje}%)`;
        
        console.log(`Actualizando elemento seccion-${index + 1} con: "${textoResultado}"`);
        sectionElement.textContent = textoResultado;
        
        // Verify the update worked
        setTimeout(() => {
          const currentText = sectionElement.textContent;
          console.log(`Verificación seccion-${index + 1}: "${currentText}"`);
          if (currentText === 'Puntuación: --') {
            console.error(`❌ La actualización falló para seccion-${index + 1}`);
  } else {
            console.log(`✅ Actualización exitosa para seccion-${index + 1}`);
          }
        }, 100);
      } else {
        console.error(`❌ No se encontró elemento seccion-${index + 1}`);
      }
    });
    
    // Update total scores
    if (resultados.totalPuntos !== undefined && resultados.porcentajeGlobal !== undefined) {
      const totalPuntosElement = document.getElementById('totalPuntos');
      const totalPorcentajeElement = document.getElementById('totalPorcentaje');
      
      if (totalPuntosElement) {
        totalPuntosElement.textContent = `${resultados.totalPuntos}/105`;
        console.log(`✅ Total puntos actualizado: ${resultados.totalPuntos}/105`);
      }
      
      if (totalPorcentajeElement) {
        const porcentajeRedondeado = Math.round(resultados.porcentajeGlobal);
        totalPorcentajeElement.textContent = `${porcentajeRedondeado}%`;
        console.log(`✅ Total porcentaje actualizado: ${porcentajeRedondeado}%`);
      }
    } else {
      console.warn('⚠️ Datos de totales faltantes:', {
        totalPuntos: resultados.totalPuntos,
        porcentajeGlobal: resultados.porcentajeGlobal
      });
    }
    
    console.log('✅ Resultados por sección mostrados correctamente');
    
  } catch (error) {
    console.error('❌ Error mostrando resultados por sección:', error);
  }
}

function configurarBotones() {
  try {
    console.log('Configurando botones de la página de resultados');
    const pdfButton = document.getElementById('descargarPDF');
    if (pdfButton) {
      pdfButton.addEventListener('click', async function() {
        try {
          console.log('Generando PDF desde servidor...');
          this.disabled = true;
          this.textContent = 'Generando PDF...';
          const usuarioData = JSON.parse(localStorage.getItem('usuarioData') || '{}');
          const keys = ['seccion1Form','seccion2Form','seccion3Form','seccion4Form','seccion5Form','seccion6Form','seccion7Form'];
          const secciones = keys.map(k => JSON.parse(localStorage.getItem(k) || '[]'));
          const resultadosCalculados = JSON.parse(localStorage.getItem('resultadosCalculados') || 'null');
          const r = await fetch('/api/pdf/resultados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioData, secciones, resultadosCalculados })
          });
          if (!r.ok) throw new Error('Fallo al generar PDF');
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Informe_Evaluacion_PDP_${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error generando PDF (server):', error);
          alert('Error al generar el PDF.');
        } finally {
          this.disabled = false;
          this.textContent = 'DESCARGAR EL INFORME';
        }
      });
    }

    const emailButton = document.getElementById('enviarEmail');
    if (emailButton) {
      emailButton.addEventListener('click', async function() {
        try {
          console.log('Enviando email desde servidor...');
          this.disabled = true;
          this.textContent = 'Enviando...';
          const usuarioData = JSON.parse(localStorage.getItem('usuarioData') || '{}');
          const keys = ['seccion1Form','seccion2Form','seccion3Form','seccion4Form','seccion5Form','seccion6Form','seccion7Form'];
          const secciones = keys.map(k => JSON.parse(localStorage.getItem(k) || '[]'));
          const resultadosCalculados = JSON.parse(localStorage.getItem('resultadosCalculados') || 'null');
          const r = await fetch('/api/email/resultados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: usuarioData.email,
              nombre: usuarioData.nombre,
              empresa: usuarioData.nombre_responsable || usuarioData.empresa,
              usuarioData,
              secciones,
              resultadosCalculados
            })
          });
          if (!r.ok) {
            const e = await r.json().catch(()=>({}));
            throw new Error(e.error || 'Fallo al enviar email');
          }
          alert('Informe enviado por email');
        } catch (error) {
          console.error('Error enviando email (server):', error);
          alert('Error al enviar el email.');
        } finally {
          this.disabled = false;
          this.textContent = 'ENVIAR POR EMAIL';
        }
      });
    }

    const backButton = document.getElementById('volverFormulario');
    if (backButton) {
      backButton.addEventListener('click', function() { window.location.href = 'index.html'; });
    }

    console.log('Botones configurados correctamente');
  } catch (error) {
    console.error('Error configurando botones:', error);
  }
}

function showNoDataMessage() {
  const container = document.querySelector('.container') || document.body;
  container.innerHTML = `
    <div class="text-center p-8">
      <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        <h3 class="font-bold">No hay datos de evaluación</h3>
        <p>No se encontraron datos de evaluación completos.</p>
      </div>
      <div class="space-x-4">
        <button onclick="crearDatosDemo(); window.location.reload();" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Crear datos demo
        </button>
        <button onclick="window.location.href='seccion_uno.html'" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
          Ir al cuestionario
        </button>
      </div>
    </div>
  `;
}

// Test function to debug percentage box issue - can be called from console
/* Removed testPercentageBoxUpdate (test-only) */
/* function testPercentageBoxUpdate() {
  console.log('=== TESTING PERCENTAGE BOX UPDATE ===');
  
  // Check if elements exist
  const porcentajeBoxElement = document.getElementById('porcentajeBox');
  const porcentajeNumeroElement = document.getElementById('porcentajeNumero');
  
  console.log('Elements found:', {
    porcentajeBox: !!porcentajeBoxElement,
    porcentajeNumero: !!porcentajeNumeroElement
  });
  
  if (porcentajeBoxElement) {
    console.log('porcentajeBox current classes:', porcentajeBoxElement.className);
    console.log('porcentajeBox current style:', porcentajeBoxElement.style.cssText);
  }
  
  if (porcentajeNumeroElement) {
    console.log('porcentajeNumero current text:', porcentajeNumeroElement.textContent);
    console.log('porcentajeNumero current classes:', porcentajeNumeroElement.className);
  }
  
  // Try to force update
  if (porcentajeNumeroElement) {
    // intentionally left blank (test-only code removed)
  }
  
  if (porcentajeBoxElement) {
    porcentajeBoxElement.className = 'w-32 h-32 rounded-lg flex items-center justify-center mb-4 shadow-lg bg-orange-500';
    console.log('✅ Forced orange background');
  }
  
  // Test the actual function (removed)
} */

// Make it globally available
/* window.testPercentageBoxUpdate = testPercentageBoxUpdate; */

// Add global function for manual testing
/* window.testPercentageBoxUpdate = function() {
  console.log("=== TESTING PERCENTAGE BOX UPDATE ===");
  
  // previously tested with demo data (test-only code removed)
  const porcentajeNumero = document.getElementById('porcentajeNumero');
  const porcentajeBox = document.getElementById('porcentajeBox');
  
  console.log('🔍 Elements found:');
  console.log('- porcentajeNumero:', porcentajeNumero ? 'YES' : 'NO');
  console.log('- porcentajeBox:', porcentajeBox ? 'YES' : 'NO');
  
  if (porcentajeNumero && porcentajeBox) {
    console.log('🔧 Testing removed');
  } else {
    console.error('❌ Required elements not found');
  }
}; */

// Add comprehensive testing function for all compliance categories
/* window.testAllComplianceCategories = function() {
  console.log("=== TESTING ALL COMPLIANCE CATEGORIES ===");
  
  const categories = [
    {
      name: "Alto Cumplimiento/Bajo Riesgo",
      percentage: 85,
      points: 89,
      expectedRange: "81-100%",
      color: "#28a745"
    },
    {
      name: "Cumplimiento Medio/Riesgo Medio", 
      percentage: 65,
      points: 68,
      expectedRange: "51-80%",
      color: "#ffc107"
    },
    {
      name: "Bajo Cumplimiento/Alto Riesgo",
      percentage: 35,
      points: 37,
      expectedRange: "21-50%", 
      color: "#fd7e14"
    },
    {
      name: "Nulo Cumplimiento/Altísimo Riesgo",
      percentage: 15,
      points: 16,
      expectedRange: "0-20%",
      color: "#dc3545"
    }
  ];
  
  categories.forEach((category, index) => {
    console.log(`\n🧪 TEST ${index + 1}: ${category.name}`);
    console.log(`📊 Percentage: ${category.percentage}% (Range: ${category.expectedRange})`);
    console.log(`🎯 Points: ${category.points}/105`);
    console.log(`🎨 Expected Color: ${category.color}`);
    
    // Test the risk level determination
    const determinedLevel = determinarNivelRiesgo(category.percentage);
    console.log(`✅ Determined Level: ${determinedLevel}`);
    console.log(`✅ Match: ${determinedLevel === category.name ? 'YES' : 'NO'}`);
    
    // Test the color assignment
    const assignedColor = PDFGenerator._getRiskColor(category.name);
    console.log(`🎨 Assigned Color: ${assignedColor}`);
    console.log(`🎨 Color Match: ${assignedColor === category.color ? 'YES' : 'NO'}`);
    
    // Test content retrieval
    const situacion = PDFGenerator._getSituacionActual(category.name);
    const repercusiones = PDFGenerator._getRepercusionesPrincipales(category.name);
    const acciones = PDFGenerator._getAccionesPrioritarias(category.name);
    const recomendaciones = PDFGenerator._getRecomendacionesInmediatas(category.name);
    
    console.log(`📝 Content Available:`);
    console.log(`   - Situación Actual: ${situacion ? 'YES' : 'NO'} (${situacion.length} chars)`);
    console.log(`   - Repercusiones: ${repercusiones ? 'YES' : 'NO'} (${repercusiones.length} items)`);
    console.log(`   - Acciones: ${acciones ? 'YES' : 'NO'} (${acciones.length} rows)`);
    console.log(`   - Recomendaciones: ${recomendaciones ? 'YES' : 'NO'} (${recomendaciones.length} items)`);
    
    // Update the UI to test visual display
    actualizarNivelRiesgo(category.percentage, category.name, category.points);
    
    console.log(`🔄 UI Updated for ${category.name}`);
  });
  
  console.log("\n=== TEST SUMMARY ===");
  console.log("✅ All 4 compliance categories tested");
  console.log("✅ Content verification completed");
  console.log("✅ UI updates applied");
  console.log("\n💡 Use testSpecificCategory('alto'), testSpecificCategory('medio'), etc. for individual tests");
}; */

// Enhanced individual category testing
/* window.testSpecificCategory = function(categoryName) {
  console.log(`=== TESTING SPECIFIC CATEGORY: ${categoryName.toUpperCase()} ===`);
  
  const scenarios = {
    "alto": { 
      percentage: 85, 
      points: 89, 
      level: "Alto Cumplimiento/Bajo Riesgo",
      range: "81-100%",
      description: "Excellent compliance with minor improvements needed"
    },
    "medio": { 
      percentage: 65, 
      points: 68, 
      level: "Cumplimiento Medio/Riesgo Medio",
      range: "51-80%", 
      description: "Basic controls but needs strengthening"
    },
    "bajo": { 
      percentage: 35, 
      points: 37, 
      level: "Bajo Cumplimiento/Alto Riesgo",
      range: "21-50%",
      description: "Critical vulnerabilities requiring immediate attention"
    },
    "nulo": { 
      percentage: 15, 
      points: 16, 
      level: "Nulo Cumplimiento/Altísimo Riesgo",
      range: "0-20%",
      description: "Critical state of total non-compliance"
    }
  };
  
  const scenario = scenarios[categoryName.toLowerCase()];
  if (!scenario) {
    console.error("❌ Invalid category. Use: alto, medio, bajo, nulo");
          return;
        }
        
  console.log(`📊 Testing ${scenario.level}`);
  console.log(`🔢 ${scenario.percentage}% (${scenario.points}/105 points)`);
  console.log(`📋 Range: ${scenario.range}`);
  console.log(`📝 Description: ${scenario.description}`);
  
  // Create demo data for this percentage
  const demoData = createDemoDataForPercentage(scenario.percentage);
  console.log(`🎲 Demo data created:`, demoData);
  
  // Update the UI
  actualizarNivelRiesgo(scenario.percentage, scenario.level, scenario.points);
  
  // Test content retrieval
  const situacion = PDFGenerator._getSituacionActual(scenario.level);
  const repercusiones = PDFGenerator._getRepercusionesPrincipales(scenario.level);
  
  console.log(`\n📖 CONTENT PREVIEW:`);
  console.log(`Situación Actual: ${situacion.substring(0, 100)}...`);
  console.log(`Repercusiones (${repercusiones.length} items):`);
  repercusiones.slice(0, 3).forEach(item => console.log(`  - ${item}`));
  
  console.log(`\n✅ Test completed for ${scenario.level}`);
  
  return scenario;
}; */
