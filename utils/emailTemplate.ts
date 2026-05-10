export const BRAND = {
    primary: "#12002f",  //background: linear-gradient(135deg, #12002f 0%, #25005a 45%, #7C3AED 100%);
    secondary: "#F4F5FF",
    accent: "#FF6B6B",
    textDark: "#1E1E1E",
    textLight: "#666666",
    white: "#FFFFFF",
    border: "#E8E8F0"
}

export const buildEmailTemplate = (
    title: string,
    bodyContent: string
) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
    </head>

    <body style="
        margin:0;
        padding:0;
        background:${BRAND.secondary};
        font-family:Arial, sans-serif;
    ">

        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center" style="padding:40px 20px;">

                    <table width="100%" cellpadding="0" cellspacing="0"
                        style="
                            max-width:600px;
                            background:${BRAND.white};
                            border-radius:16px;
                            overflow:hidden;
                            border:1px solid ${BRAND.border};
                        "
                    >

                        <!-- Header -->
                        <tr>
                            <td style="
                                background:${BRAND.primary};
                                padding:40px 30px;
                                text-align:center;
                            ">
                                <h1 style="
                                    color:white;
                                    margin:0;
                                    font-size:28px;
                                ">
                                    Micro-Event Discovery
                                </h1>

                                <p style="
                                    color:rgba(255,255,255,0.85);
                                    margin-top:10px;
                                ">
                                    Discover Events Around You
                                </p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="
                                padding:40px 35px;
                                color:${BRAND.textLight};
                                font-size:16px;
                                line-height:1.7;
                            ">
                                ${bodyContent}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="
                                padding:25px;
                                text-align:center;
                                background:#fafafa;
                                border-top:1px solid ${BRAND.border};
                            ">
                                <p style="
                                    margin:0;
                                    font-size:13px;
                                    color:#888;
                                ">
                                    © ${new Date().getFullYear()} Micro-Event Discovery
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>

    </body>
    </html>
    `
}