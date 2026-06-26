import { Screen } from "../../../src/shared/components/Screen";
import { EntryMap } from "../../../src/features/map/components/EntryMap";
import { useLoreEntries } from "../../../src/features/lore/api/loreApi";

export default function MapScreen() {
  const { data: loreEntries } = useLoreEntries();

  return (
    <Screen contentClassName="pt-3">
      <EntryMap entries={loreEntries} />
    </Screen>
  );
}
