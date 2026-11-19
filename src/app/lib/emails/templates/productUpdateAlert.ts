export const getProductUpdateAlertTemplate = (
    userName: string,
    productName: string,
    productCategory: string,
    productUrl: string,
    updatedFields: string[],
    tenantName: string // 👈 1. AGREGAMOS EL NOMBRE DE LA TIENDA COMO PARÁMETRO
) => {
    // ✅ 2. USAMOS EL NOMBRE DINÁMICO (con fallback de seguridad)
    const brandName = tenantName || process.env.BRAND_NAME || 'EmprendeFácil';
    const brandColor = process.env.BRAND_COLOR || '#3D2B1F'; 
    const accentColor = '#C9A961'; 
    const tumarcaUrl = 'https://www.tumarca.ar';

    const fieldsText = updatedFields.length === 1
        ? updatedFields[0]
        : updatedFields.slice(0, -1).join(', ') + ' y ' + updatedFields[updatedFields.length - 1];

    return {
        // 👈 3. EL ASUNTO AHORA REFLEJA LA MARCA REAL
        subject: `🔄 Actualización en ${brandName}: ${productName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #FAF7F2; padding: 40px 20px; }
    .main-card { max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E8DFD0; box-shadow: 0 10px 30px rgba(61, 43, 31, 0.04); overflow: hidden; }
    .header { padding: 32px 32px 0 32px; text-align: center; }
    .header h1 { color: ${brandColor}; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
    .header-line { width: 40px; height: 3px; background-color: ${accentColor}; margin: 16px auto 0 auto; border-radius: 2px; }
    .body-content { padding: 32px; }
    .product-box { background-color: #F5F3FF; border-left: 3px solid ${accentColor}; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .product-category { margin: 0 0 8px; font-size: 11px; color: #8B6F47; text-transform: uppercase; font-weight: 700; letter-spacing: 0.15em; }
    .product-name { margin: 0 0 20px; color: #3D2B1F; font-size: 22px; font-weight: 600; }
    .update-info { background-color: #FAF7F2; border: 1px solid #E8DFD0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center; }
    .update-text { margin: 0; color: #3D2B1F; font-size: 14px; font-weight: 500; }
    .update-highlight { color: #8B6F47; font-weight: 700; }
    .cta-button { display: inline-block; background-color: ${brandColor}; color: #FFFFFF !important; padding: 14px 32px; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 14px; letter-spacing: 0.05em; }
    .footer { background-color: #FAF7F2; padding: 24px 32px; text-align: center; border-top: 1px solid #E8DFD0; border-radius: 0 0 20px 20px; }
    .footer-brand { color: #8B6F47; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 8px 0; }
    .footer-copy { color: #A8A29E; font-size: 12px; margin: 0 0 16px 0; line-height: 1.5; }
    .footer-dev { font-size: 12px; color: #A8A29E; margin: 0; }
    .footer-dev a { color: #3D2B1F; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      
      <div class="header">
        <h1>🔄 Hemos actualizado una pieza</h1>
        <div class="header-line"></div>
      </div>

      <div class="body-content">
        <p style="font-size: 15px; line-height: 1.6; color: #6B5B4F; margin-top: 0;">
          Hola <strong style="color: #3D2B1F;">${userName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #6B5B4F; margin-bottom: 0;">
          Hay novedades importantes en una de las creaciones de <strong>${brandName}</strong> que te interesan:
        </p>
        
        <div class="product-box">
          <p class="product-category">${productCategory}</p>
          <h2 class="product-name">${productName}</h2>
          
          <div class="update-info">
            <p class="update-text">
              ✨ Se actualizó: <span class="update-highlight">${fieldsText}</span>
            </p>
          </div>
          
          <div style="text-align: center;">
            <a href="${productUrl}" class="cta-button">Ver los cambios →</a>
          </div>
        </div>

        <p style="font-size: 14px; color: #8B6F47; line-height: 1.6; margin-bottom: 0; text-align: center;">
          Te invitamos a descubrir las mejoras que hemos realizado para ti.
        </p>
      </div>

      <div class="footer">
        <p class="footer-brand">${brandName}</p> <!-- 👈 FOOTER DINÁMICO -->
        <p class="footer-copy">© ${new Date().getFullYear()} · Hecho con dedicación y buena energía 💜</p>
        <p class="footer-dev">
          Plataforma desarrollada por <a href="${tumarcaUrl}">www.tumarca.ar</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`,
        text: `¡Actualización en ${brandName}!\n\nHola ${userName}, hemos actualizado ${fieldsText} del producto: ${productName} (${productCategory}) en ${brandName}.\nMira los cambios aquí: ${productUrl}\n\n${brandName} · Hecho con dedicación y buena energía 💜\nPlataforma desarrollada por www.tumarca.ar`
    };
};