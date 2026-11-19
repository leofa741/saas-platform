export const getNewDesignRequestAlertTemplate = (
  clientName: string,
  productType: string,
  designTitle: string,
  adminPanelUrl: string,
  disenoId: string,
  tenantName: string // 👈 1. AGREGAMOS ESTE PARÁMETRO
) => {
  // ✅ 2. USAMOS EL NOMBRE DINÁMICO (con fallback de seguridad)
  const brandName = tenantName || process.env.BRAND_NAME || 'EmprendeFácil';
  const brandColor = process.env.BRAND_COLOR || '#3D2B1F'; 
  const accentColor = '#C9A961'; 
  const reviewUrl = `${adminPanelUrl}/gestion/diseno-personalizado/${disenoId}`;

  return {
    subject: `✨ Nueva solicitud de diseño personalizado de ${clientName} en ${brandName}`, // 👈 3. INCLUIMOS LA MARCA EN EL ASUNTO
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Tus estilos se mantienen exactamente igual */
    body { margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #FAF7F2; padding: 40px 20px; }
    .main-card { max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E8DFD0; box-shadow: 0 10px 30px rgba(61, 43, 31, 0.04); overflow: hidden; }
    .header { padding: 32px 32px 0 32px; text-align: center; }
    .header h1 { color: ${brandColor}; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; } /* 👈 Color dinámico */
    .header-line { width: 40px; height: 3px; background-color: ${accentColor}; margin: 16px auto 0 auto; border-radius: 2px; }
    .body-content { padding: 32px; }
    .info-box { background-color: #F5F3FF; border-left: 3px solid ${accentColor}; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .info-row { margin-bottom: 16px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { display: block; color: #8B6F47; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
    .info-value { display: block; color: #3D2B1F; font-size: 15px; font-weight: 600; }
    .cta-button { display: block; width: 100%; box-sizing: border-box; background-color: ${brandColor}; color: #FFFFFF !important; padding: 16px 32px; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 15px; text-align: center; letter-spacing: 0.05em; margin-top: 24px; }
    .footer { background-color: #FAF7F2; padding: 24px 32px; text-align: center; border-top: 1px solid #E8DFD0; }
    .footer-brand { color: #8B6F47; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 8px 0; }
    .footer-copy { color: #A8A29E; font-size: 12px; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <div class="header">
        <h1>✨ Nueva Solicitud de Diseño</h1>
        <div class="header-line"></div>
      </div>

      <div class="body-content">
        <p style="font-size: 15px; line-height: 1.6; color: #6B5B4F; margin-top: 0;">
          Hola <strong style="color: #3D2B1F;">Equipo de ${brandName}</strong>, <!-- 👈 SALUDO PERSONALIZADO -->
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #6B5B4F; margin-bottom: 0;">
          Se ha recibido una nueva solicitud de diseño personalizado en el sitio web. A continuación, los detalles iniciales:
        </p>
        
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Cliente</span>
            <span class="info-value">${clientName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tipo de Producto</span>
            <span class="info-value">${productType}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Título del Proyecto</span>
            <span class="info-value">${designTitle}</span>
          </div>
        </div>

        <p style="font-size: 14px; color: #8B6F47; line-height: 1.6; margin-bottom: 0;">
          Por favor, revisa los detalles, las imágenes de referencia y responde al cliente a la brevedad desde el panel de administración.
        </p>

        <a href="${reviewUrl}" class="cta-button">Revisar y Responder Solicitud →</a>
      </div>

      <div class="footer">
        <p class="footer-brand">${brandName} · Panel de Administración</p> <!-- 👈 FOOTER DINÁMICO -->
        <p class="footer-copy">© ${new Date().getFullYear()} · Hecho con dedicación y buena energía 💜</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    text: `✨ Nueva Solicitud de Diseño en ${brandName}\n\nHola Equipo,\n\nSe ha recibido una nueva solicitud de diseño personalizado.\n\nCliente: ${clientName}\nProducto: ${productType}\nTítulo: ${designTitle}\n\nPor favor, revisa los detalles y responde al cliente a la brevedad desde el panel de administración:\n${reviewUrl}\n\n${brandName} · Panel de Administración`
  };
};