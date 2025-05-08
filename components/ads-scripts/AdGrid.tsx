import HilltopAdUnit from './HilltopAdUnit';

const AdGrid = () => {
  const adUrls = [
    '//frequentday.com/b/XQVos.d/GplF0/YEW/cK/xeOmF9auRZ_U/lmk-PDTZYIwdMVjLcW2xNODigBtlNqjjAYyANRzhYe0ROvQj', // Ad 1
    '//frequentday.com/b.X/VUsBdWG_la0fYIWycA/Jekmx9sujZSUDlMkOPQTZYrwBMvjJct2ZNtzDQNt/NkjpA/ypNNzTYZ3/NgQN', // Ad 2 (Example)
    '//frequentday.com/b.XAVzs-dMGkl/0oYEWgcK/seUme9du/ZuUWlJkhPFT/YgwlNVDrICzuOXTTApt/NvjkAB0uMPj_MC5PM/Qi', // Ad 3 (Example)
  ];

  return (
    <div className="flex flex-col justify-center mb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adUrls.map((url, i) => (
          <HilltopAdUnit key={i} adUrl={url} />
        ))}
      </div>
    </div>
  );
};

export default AdGrid;
