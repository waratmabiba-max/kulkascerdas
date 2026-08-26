import { ImageResponse } from 'next/og';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const size = parseInt(searchParams.get('size') || '192');
  
  const fontSize = size === 192 ? 100 : 200;
  const borderRadius = size === 192 ? 32 : 64;

  return new ImageResponse(
    <div
      style={{
        fontSize: fontSize,
        background: '#3b82f6',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius,
        color: 'white',
      }}
    >
      🧊
    </div>,
    {
      width: size,
      height: size,
    }
  );
}

export const runtime = 'edge';
