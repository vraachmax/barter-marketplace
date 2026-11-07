import SwiftUI

/// Exact vector silhouette transcribed from the approved web Bubble B SVG
/// (apps/web/public/brand/bubble-b-v3.svg). No placeholder letter/logo.
struct BubbleBMark: View {
    var body: some View {
        BubbleBShape()
            .fill(
                LinearGradient(
                    stops: [
                        .init(color: Color(red: 1, green: 97/255, blue: 10/255), location: 0),
                        .init(color: Color(red: 1, green: 150/255, blue: 9/255), location: 0.47),
                        .init(color: Color(red: 1, green: 101/255, blue: 0), location: 0.74),
                        .init(color: Color(red: 1, green: 71/255, blue: 0), location: 1)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                style: FillStyle(eoFill: true)
            )
            .aspectRatio(96.0 / 105.0, contentMode: .fit)
            .accessibilityHidden(true)
    }
}

private struct BubbleBShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let sx = rect.width / 96
        let sy = rect.height / 105
        func polygon(_ points: [(CGFloat, CGFloat)]) {
            guard let first = points.first else { return }
            path.move(to: CGPoint(x: first.0 * sx, y: first.1 * sy))
            for (x, y) in points.dropFirst() {
                path.addLine(to: CGPoint(x: x * sx, y: y * sy))
            }
            path.closeSubpath()
        }

        polygon([
            (6.6,2.5),(2,7.3),(0,13.2),(0,61.3),(2.8,72.7),
            (7.8,82),(12.7,87.6),(20.3,93.4),(28.1,97.2),
            (35.9,99.2),(47.1,99.7),(54.2,98.7),(63.3,95.7),
            (71.1,91.1),(79.2,83.8),(83.5,78),(87.3,70.1),
            (89.1,63.5),(89.6,51.4),(88.9,46.6),(86.1,38),
            (82,30.9),(73.4,22.8),(62.3,18),(55.7,17),
            (27.3,17),(27.6,3),(25.3,0.3),(11.9,0.3)
        ])
        polygon([
            (26.6,36.2),(29.4,39.2),(34.2,41.5),(44.3,39),
            (51.9,40),(57.2,42.8),(60.5,46.1),(63.3,51.4),
            (64.1,58),(61.8,65.6),(57.5,70.9),(53.4,73.7),
            (49.4,75.2),(42.5,75.7),(37.5,74.4),(31.1,70.1),
            (28.6,66.8),(26.1,60)
        ])
        return path
    }
}
