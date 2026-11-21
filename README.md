# The World Today: Saturday 21 November 2026

[![make.fun](https://make.fun/badge/news-image-20261121.svg)](https://make.fun/bounty/news-image-20261121)
[![Rank](https://make.fun/badge/news-image-20261121/dunoil/makefun-news-image-20261121/rank.svg)](https://make.fun/bounty/news-image-20261121)
[![Reward](https://make.fun/badge/news-image-20261121/dunoil/makefun-news-image-20261121/reward.svg)](https://make.fun/bounty/news-image-20261121)

One image that sums up the world's news of **Saturday 21 November 2026**, entered in the
[make.fun bounty news-image-20261121](https://make.fun/bounty/news-image-20261121).

## What the image holds

A broadsheet front page, 1024 by 1024, drawn from scratch in pure TypeScript
(Node standard library only, no fonts, no images, no network):

- **3 lead stories**: COP31 in overtime in Antalya with no deal on day 13; five Houthi
  missiles shot down over Saudi Arabia; a magnitude 6.7 earthquake shaking central Peru.
- **10 illustrated cards**: Zelensky on the Crimea bridge, Iran and the US drone over
  Hormuz, Iran's uranium stock, Trump's data centre tax vow, China and Japan over
  Taiwan, Australia-China AI talks, Bitcoin below $59,000, the Air Niugini landing in
  Davao, Russell fastest in Las Vegas practice, Rahul's Test century.
- **22 one-line briefs**, each with its source.
- **Day in Numbers** strip, a **world map with numbered pins** matching the 13
  illustrated stories, a **stories-by-region bar** (7 regions, 35 stories in all),
  and a **Date Check** footer naming stories deliberately left out because they
  happened on earlier days.

35 stories, 13 illustrated, 7 regions, 22 briefs. Sources: AFP, AP, Reuters,
Al Jazeera, USGS, Arab News, Kyiv Post, ABC, Formula 1, CoinGecko.

## How it runs

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` renders the page pixel by pixel with a built-in 5x7 bitmap font and its
own PNG encoder, then writes `entry.png` to `$MAKEFUN_OUTPUT_DIR`. The render is
fully deterministic: fixed layout, fixed seed, no timestamps, no randomness, so
both runs write identical bytes.

## License

MIT. See [LICENSE](LICENSE).
