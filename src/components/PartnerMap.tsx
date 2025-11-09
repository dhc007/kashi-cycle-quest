import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface Partner {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  phone_number: string;
}

const PartnerMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error loading partners:', error);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || partners.length === 0) return;

    // Initialize map
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [82.9739, 25.3176], // Varanasi coordinates
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add markers for each partner
    partners.forEach((partner) => {
      if (partner.latitude && partner.longitude) {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${partner.name}</h3>
            <p style="font-size: 14px; margin-bottom: 4px;">${partner.address}</p>
            <p style="font-size: 14px; color: #666;">${partner.city}, ${partner.state}</p>
            <p style="font-size: 14px; margin-top: 4px;">📞 ${partner.phone_number}</p>
          </div>
        `);

        new mapboxgl.Marker({ color: '#FF6B6B' })
          .setLngLat([partner.longitude, partner.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });

    // Fit bounds to show all markers
    if (partners.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      partners.forEach(partner => {
        if (partner.latitude && partner.longitude) {
          bounds.extend([partner.longitude, partner.latitude]);
        }
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [partners]);

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default PartnerMap;