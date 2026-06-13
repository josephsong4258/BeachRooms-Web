// Campus parking lots shown on the map.
//
// NOTE: these coordinates are approximate seeds. Adjust latitude/longitude
// to the real lot locations (same workflow as tuning building coordinates,
// except this file is bundled with the app, so changes need a deploy, not a
// cache refresh).

export type ParkingType = 'student' | 'employee';

export interface ParkingLot {
  id: string;
  name: string;
  type: ParkingType;
  latitude: number;
  longitude: number;
  // Optional lot outline as [longitude, latitude] vertices (note the order —
  // GeoJSON convention, opposite of the fields above). No need to repeat the
  // first point at the end. When present, the lot renders as a shaded shape
  // instead of a circle. To trace one in dev mode: shift-click each corner of
  // the lot on the map; the full ready-to-paste snippet is copied after every
  // click (a normal click resets the trace).
  polygon?: [number, number][];
  // Optional circle size multiplier. Setting it forces the lot to render as
  // a circle badge ABOVE the 3D buildings, even when a polygon is present.
  // Use for parking structures: their traced footprint would be hidden
  // underneath their own building model.
  size?: number;
}

export const PARKING_LOTS: ParkingLot[] = [
  { id: 'pv-north', name: 'Palo Verde North Structure', type: 'student', latitude: 33.787595, longitude: -118.109284, size: 1.8, polygon: [[-118.109841, 33.786912], [-118.109783, 33.786906], [-118.109776, 33.786833], [-118.108933, 33.786844], [-118.108927, 33.786915], [-118.108866, 33.78692], [-118.108861, 33.787914], [-118.108907, 33.787919], [-118.108915, 33.787959], [-118.109764, 33.787965], [-118.109758, 33.787922], [-118.109828, 33.787926]]},
  { id: 'pv-south', name: 'Palo Verde South Structure', type: 'student',latitude: 33.786418, longitude: -118.109366,  size: 1.8, polygon: [[-118.109801, 33.786619], [-118.109933, 33.786622], [-118.109933, 33.785643], [-118.109864, 33.785637], [-118.109858, 33.785583], [-118.109021, 33.785599], [-118.109021, 33.785645], [-118.10895, 33.785649], [-118.108951, 33.78663], [-118.109018, 33.786645], [-118.109017, 33.786687]]},
  { id: 'g12', name: 'Lot G12', type: 'student', latitude: 33.7837, longitude: -118.1198, polygon: [[-118.109991, 33.788552], [-118.111195, 33.788565], [-118.111172, 33.787384], [-118.109999, 33.787394], [-118.10995, 33.78738], [-118.109899, 33.787378], [-118.109899, 33.787211], [-118.109975, 33.78721], [-118.111227, 33.787226], [-118.111226, 33.78706], [-118.109947, 33.787066]] },
  { id: 'g12-e', name: 'Lot G12 Employee Parking', type: 'employee', latitude: 33.7837, longitude: -118.1198, polygon: [[-118.109969, 33.787352], [-118.109979, 33.787243], [-118.111196, 33.787248], [-118.111198, 33.787369], [-118.109973, 33.787361]] },
  { id: 'g13', name: 'Lot G13', type: 'student', latitude: 33.7837, longitude: -118.1198,polygon: [[-118.10835, 33.786916], [-118.108812, 33.786902], [-118.108834, 33.787987], [-118.10891, 33.787974], [-118.109828, 33.787979], [-118.109808, 33.788094], [-118.108333, 33.788082], [-118.108336, 33.786957]] },

  { id: 'g1', name: 'Lot G1', type: 'student', latitude: 33.781699, longitude: -118.119284, polygon: [[-118.118243, 33.781552], [-118.118251, 33.781861], [-118.120326, 33.78183], [-118.120314, 33.781554]] },
  { id: 'g2', name: 'Lot G2', type: 'student', latitude: 33.783919, longitude: -118.120780, polygon: [[-118.120713, 33.783301], [-118.120056, 33.78421], [-118.120869, 33.784553], [-118.121482, 33.783612]] },
  { id: 'g4', name: 'Lot G4', type: 'student', latitude: 33.784499, longitude: -118.118331, polygon: [[-118.117671, 33.783994], [-118.119189, 33.784729], [-118.119036, 33.785016], [-118.117428, 33.784255]] },
  { id: 'g5', name: 'Lot G5', type: 'student', latitude: 33.784811, longitude: -118.116467, polygon: [[-118.116146, 33.784503], [-118.116767, 33.784512], [-118.11676, 33.784763], [-118.116467, 33.785138], [-118.116193, 33.785141]] },
  { id: 'g6', name: 'Lot G6', type: 'student', latitude: 33.785538, longitude: -118.117666, polygon: [[-118.117186, 33.784512], [-118.118829, 33.785335], [-118.118597, 33.785634], [-118.118595, 33.786053], [-118.116401, 33.78606], [-118.116385, 33.785633]] },
  { id: 'g7', name: 'Lot G7', type: 'student', latitude: 33.786639, longitude: -118.117653, polygon: [[-118.116364, 33.786276], [-118.116333, 33.786992], [-118.118999, 33.786987], [-118.118917, 33.786299]] },
  { id: 'g8', name: 'Lot G8', type: 'student', latitude: 33.787392, longitude: -118.117669, polygon: [[-118.116308, 33.787037], [-118.116315, 33.787742], [-118.119026, 33.787738], [-118.119027, 33.78705]] },

  { id: 'g9', name: 'Lot G9', type: 'student', latitude: 33.788187, longitude: -118.117406, polygon: [[-118.116414, 33.787762], [-118.116413, 33.788363], [-118.117813, 33.788363], [-118.117963, 33.787769]] },
  { id: 'g11', name: 'Lot G11', type: 'student', latitude: 33.787702, longitude: -118.115733, polygon: [[-118.115346, 33.787037], [-118.11614, 33.787064], [-118.116109, 33.788352], [-118.115337, 33.788353]] },
  { id: 'g14', name: 'Lot G14', type: 'student', latitude: 33.786110, longitude: -118.108584, polygon: [[-118.108307, 33.786595], [-118.10833, 33.78565], [-118.10885, 33.785657], [-118.10885, 33.786537]] },
  { id: 'pyramid', name: 'Pyramid Parking Structure', type: 'student', latitude: 33.786213, longitude: -118.115659, size: 1.8, polygon: [[-118.11531, 33.78473], [-118.11532, 33.78687], [-118.116129, 33.786859], [-118.116085, 33.784747]] },
  { id: 'e1', name: 'Lot E1', type: 'employee', latitude: 33.783613, longitude: -118.116723, polygon: [[-118.117058, 33.784226], [-118.11756, 33.783513], [-118.116172, 33.782805], [-118.115683, 33.783523]]},
  { id: 'e7', name: 'Lot E2', type: 'employee', latitude: 33.778577, longitude: -118.111818, polygon: [[-118.111572, 33.778733], [-118.111555, 33.778374], [-118.112074, 33.778478], [-118.112074, 33.778482], [-118.111912, 33.778838]]},
  { id: 'e8', name: 'Lot E8', type: 'employee', latitude: 33.775797, longitude: -118.112466, polygon: [[-118.113201, 33.776041], [-118.113357, 33.77556], [-118.111632, 33.775636], [-118.111656, 33.776083]]},
  { id: 'e9', name: 'Lot E9', type: 'employee', latitude: 33.776399, longitude: -118.114893, polygon: [[-118.115242, 33.776887], [-118.114872, 33.776798], [-118.114846, 33.776664], [-118.11464, 33.776618], [-118.114647, 33.776087], [-118.114664, 33.776037], [-118.114702, 33.776022], [-118.115019, 33.775956], [-118.115113, 33.775982], [-118.115136, 33.776717]]},
  { id: 'e10', name: 'Lot E10', type: 'employee', latitude: 33.779435, longitude: -118.114929, polygon: [[-118.114855, 33.779749], [-118.114864, 33.780116], [-118.115134, 33.780112], [-118.115145, 33.780095], [-118.115136, 33.778898], [-118.114723, 33.778999]]},
  { id: 'e11', name: 'Lot E11', type: 'employee', latitude: 33.780865, longitude: -118.114858, polygon: [[-118.115257, 33.780341], [-118.114742, 33.780333], [-118.114587, 33.781212], [-118.115053, 33.781257]]},
  { id: 'e7', name: 'Lot E7', type: 'employee', latitude: 33.782443, longitude: -118.114039, polygon: [[-118.113531, 33.782479], [-118.113791, 33.782067], [-118.114413, 33.782381], [-118.114396, 33.782644], [-118.115522, 33.783248], [-118.115422, 33.783449]]},
  { id: 'e3', name: 'Lot E3', type: 'employee', latitude: 33.783654, longitude: -118.112447, polygon: [[-118.113288, 33.783722], [-118.113291, 33.783551], [-118.111685, 33.783561], [-118.111673, 33.783718]]},
  { id: 'e4', name: 'Lot E4', type: 'employee', latitude: 33.784237, longitude: -118.111797, polygon: [[-118.111902, 33.783842], [-118.111711, 33.783842], [-118.111698, 33.784756], [-118.111934, 33.784735]]},
  { id: 'g3', name: 'Lot E11', type: 'student', latitude: 33.782883, longitude: -118.117355, polygon: [[-118.117005, 33.782498], [-118.116678, 33.782875], [-118.117668, 33.783367], [-118.117961, 33.782872]] },
  { id: 'e5', name: 'Lot E5', type: 'employee', latitude: 33.784491, longitude: -118.108948, polygon: [[-118.109681, 33.784616], [-118.109679, 33.784448], [-118.108198, 33.78444], [-118.108196, 33.784607]]},
  { id: 'e6', name: 'Lot E6', type: 'employee', latitude: 33.782430, longitude: -118.108460, polygon: [[-118.10866, 33.783238], [-118.108264, 33.783245], [-118.108278, 33.781644], [-118.108658, 33.781656]]},


];
