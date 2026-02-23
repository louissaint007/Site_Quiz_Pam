import React, { useEffect } from 'react';

interface AdBlockProps {
    adSlot: string;
    className?: string;
}

const AdBlock: React.FC<AdBlockProps> = ({ adSlot, className = "" }) => {
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                const adsbygoogle = (window as any).adsbygoogle || [];
                adsbygoogle.push({});
            }
        } catch (err) {
            console.error("AdSense error:", err);
        }
    }, []);

    return (
        <div className={`w-full overflow-hidden flex justify-center py-4 ${className}`}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block', minWidth: '300px', width: '100%' }}
                data-ad-client="ca-pub-3177400792418778"
                data-ad-slot={adSlot}
                data-ad-format="auto"
                data-full-width-responsive="true"
            ></ins>
        </div>
    );
};

export default AdBlock;
