# Food Transparency UK

An evidence-based, citation-first archive of how UK packaged-food recipes have
changed over time. Every published fact is traceable to a primary source,
verified to a standard matched to its claim type, and honest about its
uncertainty.

## Licensing

This repository carries two separate licences:

- **Code** is licensed under the MIT Licence (see [`LICENSE`](LICENSE)). This
  covers the Eleventy build, templates, scripts and validation gates.
- **The canonical dataset** (the fact and source records under `src/_data/`
  and the schemas that shape them) is licensed under the **Open Database
  License (ODbL) 1.0** (see [`LICENSE-DATA`](LICENSE-DATA)). The canonical
  choice is recorded machine-readably in
  [`src/_data/meta.json`](src/_data/meta.json) under `datasetLicence`. CC BY 4.0
  was the flagged alternative considered.

Every source record in [`src/_data/sources.json`](src/_data/sources.json) also
carries its own per-source `licence` object, so each fact's upstream rights are
auditable in place. Any fact derived from Open Food Facts is identifiable by its
`off` source id; ODbL's share-alike obligation for that data is satisfied by
redistributing the dataset under ODbL.
