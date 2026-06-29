export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat1 = searchParams.get('lat1')
  const lng1 = searchParams.get('lng1')
  const lat2 = searchParams.get('lat2')
  const lng2 = searchParams.get('lng2')

  if (!lat1 || !lng1 || !lat2 || !lng2) {
    return Response.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248&start=${lng1},${lat1}&end=${lng2},${lat2}`
    )
    
    if (!response.ok) {
      throw new Error(`ORS API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.routes?.[0]?.summary?.distance) {
      const km = Math.round(data.routes[0].summary.distance / 1000)
      return Response.json({ distance: km })
    }

    return Response.json({ distance: null })
  } catch (err) {
    console.error('Distance calculation error:', err)
    return Response.json({ distance: null, error: String(err) })
  }
}
