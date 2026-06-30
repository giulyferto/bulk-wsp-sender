"use client";
import { type ReactNode } from "react";

interface WhatsAppPreviewProps {
  body: string;
  imageUrls?: string[];
  label?: string;
}

function WspIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="white" width="13" height="13">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function Bubble({ children, isLast }: { children: ReactNode; isLast: boolean }) {
  return (
    <div style={{
      background: "#dcf8c6",
      borderRadius: "8px 8px 0 8px",
      maxWidth: "88%",
      alignSelf: "flex-end",
      position: "relative",
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      marginTop: "4px",
    }}>
      {isLast && (
        <div style={{
          position: "absolute",
          bottom: 0,
          right: "-7px",
          width: 0,
          height: 0,
          borderLeft: "7px solid #dcf8c6",
          borderBottom: "8px solid transparent",
        }} />
      )}
      {children}
    </div>
  );
}

export function WhatsAppPreview({ body, imageUrls = [], label }: WhatsAppPreviewProps) {
  const hasContent = body.trim() || imageUrls.length > 0;
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const truncatedBody = body.length > 300 ? body.slice(0, 300) + "…" : body;

  const imageGrid = imageUrls.slice(0, 4);
  const gridCols = imageGrid.length === 1 ? "1fr" : "1fr 1fr";
  const imageHeight = imageGrid.length === 1 ? 120 : 64;

  const totalBubbles = (truncatedBody ? 1 : 0) + imageGrid.length;
  let bubbleIndex = 0;

  return (
    <div className="flex flex-col items-center select-none">
      {/* Phone frame */}
      <div style={{
        background: "#18181b",
        borderRadius: "36px",
        padding: "8px",
        boxShadow: "0 0 0 1.5px #3f3f46, inset 0 0 0 1px rgba(255,255,255,0.04), 0 20px 40px rgba(0,0,0,0.25)",
        width: "256px",
      }}>
        {/* Screen */}
        <div style={{
          background: "#e5ddd5",
          borderRadius: "28px",
          overflow: "hidden",
          minHeight: "460px",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Status bar */}
          <div style={{ background: "#075e54", height: "10px" }} />

          {/* WA header bar */}
          <div style={{
            background: "#075e54",
            padding: "8px 14px 10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <div style={{
              width: "34px", height: "34px",
              borderRadius: "50%",
              background: "#128c7e",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <WspIcon />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: "white", fontSize: "13px", fontWeight: 600, lineHeight: 1.2, margin: 0 }}>Mi empresa</p>
              <p style={{ color: "rgba(255,255,255,0.58)", fontSize: "10px", margin: 0 }}>en línea</p>
            </div>
          </div>

          {/* Chat area */}
          <div style={{
            flex: 1,
            padding: "12px 10px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
            backgroundSize: "16px 16px",
          }}>
            {hasContent ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {/* Text bubble first */}
                {truncatedBody && (() => { const isLast = ++bubbleIndex === totalBubbles; return (
                  <Bubble isLast={isLast}>
                    <p style={{
                      fontSize: "12px",
                      color: "#1a1a1a",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      lineHeight: 1.45,
                      margin: 0,
                      padding: "8px 10px 4px",
                    }}>
                      {truncatedBody}
                    </p>
                    <p style={{
                      textAlign: "right",
                      fontSize: "10px",
                      color: "rgba(0,0,0,0.36)",
                      margin: "2px 0 0",
                      padding: "0 10px 4px",
                    }}>
                      {timeStr} ✓✓
                    </p>
                  </Bubble>
                ); })()}

                {/* Image bubbles after */}
                {imageGrid.map((url, i) => { const isLast = ++bubbleIndex === totalBubbles; return (
                  <Bubble key={i} isLast={isLast}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      style={{
                        width: "100%",
                        height: `${imageHeight}px`,
                        objectFit: "cover",
                        display: "block",
                        borderRadius: "5px 5px 0 0",
                      }}
                    />
                    <p style={{
                      textAlign: "right",
                      fontSize: "10px",
                      color: "rgba(0,0,0,0.36)",
                      margin: 0,
                      padding: "2px 7px 4px",
                    }}>
                      {timeStr} ✓✓
                    </p>
                  </Bubble>
                ); })}
              </div>
            ) : (
              <div style={{
                background: "rgba(255,255,255,0.65)",
                borderRadius: "8px",
                padding: "14px 18px",
                textAlign: "center",
                alignSelf: "center",
              }}>
                <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.35)", margin: 0, lineHeight: 1.5 }}>
                  El mensaje aparecerá aquí
                </p>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{
            background: "#f0f0f0",
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            <div style={{
              flex: 1,
              background: "white",
              borderRadius: "24px",
              padding: "6px 12px",
              fontSize: "11px",
              color: "rgba(0,0,0,0.26)",
            }}>
              Escribe un mensaje
            </div>
            <div style={{
              width: "28px", height: "28px",
              background: "#075e54",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <MicIcon />
            </div>
          </div>
        </div>
      </div>

      {label !== undefined && (
        <p style={{ marginTop: "10px", fontSize: "11px", color: "rgba(0,0,0,0.3)", letterSpacing: "0.04em" }}>
          {label}
        </p>
      )}
    </div>
  );
}
